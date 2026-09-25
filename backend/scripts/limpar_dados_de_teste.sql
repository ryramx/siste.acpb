-- Limpeza dos dados de teste antes da entrega do sistema à associação.
--
-- O que faz, o que preserva e por quê: ver backend/LIMPEZA_ANTES_DA_ENTREGA.md.
--
-- Por padrão é um ENSAIO: apaga tudo dentro de uma transação, mostra as contagens de antes e
-- depois e desfaz no final. Só grava quando `confirmar=sim` é passado explicitamente.
--
--   # 1. ensaio (não grava nada)
--   psql "$DATABASE_URL" -v manter_emails='admin@acpb.org.br' -f scripts/limpar_dados_de_teste.sql
--
--   # 2. execução de verdade, depois de revisar o ensaio e de um backup recente
--   psql "$DATABASE_URL" -v manter_emails='admin@acpb.org.br' -v confirmar=sim \
--        -f scripts/limpar_dados_de_teste.sql
--
-- Variáveis:
--   manter_emails   obrigatória. E-mails (separados por vírgula) dos usuários que continuam no
--                   sistema junto com a pessoa, os telefones e os perfis de cada um. Todo o resto
--                   de pessoas/usuários é apagado. Pelo menos um precisa ser Administrador ativo.
--   manter_contas   opcional, `sim` para preservar `contas_financeiras` (ex.: se as contas
--                   cadastradas já forem as contas bancárias reais da associação). Padrão: apaga.
--   confirmar       opcional, `sim` para gravar (COMMIT). Sem ela, termina em ROLLBACK.
--
-- Além do banco, gera no diretório atual `arquivos_para_remover.csv`: as chaves dos comprovantes
-- e das fotos cujos registros foram apagados. Esses arquivos vivem no Storage, fora do banco, e
-- precisam ser removidos à parte.

\set ON_ERROR_STOP on

\if :{?manter_emails}
\else
  -- Via RAISE, e não \quit, para o psql sair com erro e um script que o chame perceber.
  DO $$ BEGIN RAISE EXCEPTION 'Informe -v manter_emails=''email1,email2'' com os usuários que '
                              'devem continuar. Nada foi alterado.'; END $$;
\endif

\if :{?manter_contas}
\else
  \set manter_contas nao
\endif

\if :{?confirmar}
\else
  \set confirmar nao
\endif

-- psql só aceita booleanos (on/off/true/false) no \if; traduz o `sim` das variáveis.
SELECT :'manter_contas' = 'sim' AS manter_contas_bool,
       :'confirmar' = 'sim' AS confirmar_bool \gset

BEGIN;

-- Ninguém escreve no banco enquanto a limpeza roda (a API pode continuar no ar lendo).
LOCK TABLE
    auditoria, senha_reset_tokens, anexos_financeiros, movimentacoes_financeiras,
    contas_financeiras, inscricoes, eventos, projeto_voluntarios, projeto_beneficiarios,
    atendimentos, projetos, patrimonios, membros, voluntarios, beneficiarios,
    usuario_perfis, usuarios, telefones, pessoas
IN SHARE ROW EXCLUSIVE MODE;

-- ---------------------------------------------------------------------------------------------
-- 1. Travas de segurança
-- ---------------------------------------------------------------------------------------------

CREATE TEMP TABLE _emails_manter ON COMMIT DROP AS
SELECT DISTINCT lower(trim(e)) AS email
FROM unnest(string_to_array(:'manter_emails', ',')) AS e
WHERE trim(e) <> '';

CREATE TEMP TABLE _usuarios_manter ON COMMIT DROP AS
SELECT u.id, u.pessoa_id, u.email
FROM usuarios u
JOIN _emails_manter m ON m.email = lower(u.email);

DO $$
DECLARE
    faltando text;
    desconhecidas text;
BEGIN
    SELECT string_agg(m.email, ', ') INTO faltando
    FROM _emails_manter m
    WHERE NOT EXISTS (SELECT 1 FROM _usuarios_manter u WHERE lower(u.email) = m.email);
    IF faltando IS NOT NULL THEN
        RAISE EXCEPTION 'Nenhum usuário com o(s) e-mail(s): %. Nada foi alterado.', faltando;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM _usuarios_manter um
        JOIN usuarios u ON u.id = um.id AND u.ativo
        JOIN usuario_perfis up ON up.usuario_id = u.id
        JOIN perfis p ON p.id = up.perfil_id AND p.nome = 'Administrador' AND p.ativo
    ) THEN
        RAISE EXCEPTION 'Nenhum dos usuários mantidos é Administrador ativo: o sistema ficaria '
                        'sem ninguém capaz de entrar e cadastrar. Nada foi alterado.';
    END IF;

    -- O banco de produção já existia antes deste repositório (ver RELACIONAMENTOS.md). Se houver
    -- alguma tabela que este script não conhece, é melhor parar do que deixar dado de teste para
    -- trás ou esbarrar numa chave estrangeira no meio do caminho.
    SELECT string_agg(table_name, ', ') INTO desconhecidas
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (
          -- preservadas
          'alembic_version', 'perfis', 'permissoes', 'perfil_permissoes', 'cargos',
          'categorias_financeiras',
          -- limpas (inteiras ou exceto os usuários mantidos)
          'auditoria', 'senha_reset_tokens', 'anexos_financeiros', 'movimentacoes_financeiras',
          'contas_financeiras', 'inscricoes', 'eventos', 'projeto_voluntarios',
          'projeto_beneficiarios', 'atendimentos', 'projetos', 'patrimonios', 'membros',
          'voluntarios', 'beneficiarios', 'usuario_perfis', 'usuarios', 'telefones', 'pessoas'
      );
    IF desconhecidas IS NOT NULL THEN
        RAISE EXCEPTION 'Tabela(s) fora do plano de limpeza: %. Revise o script antes de rodar.',
                        desconhecidas;
    END IF;
END $$;

\echo
\echo '== Usuários que serão mantidos'
SELECT u.id, u.email, u.ativo, p.nome_completo,
       string_agg(pf.nome, ', ' ORDER BY pf.nome) AS perfis
FROM _usuarios_manter um
JOIN usuarios u ON u.id = um.id
JOIN pessoas p ON p.id = u.pessoa_id
LEFT JOIN usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN perfis pf ON pf.id = up.perfil_id
GROUP BY u.id, u.email, u.ativo, p.nome_completo
ORDER BY u.id;

-- ---------------------------------------------------------------------------------------------
-- 2. Contagem antes
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION pg_temp.contagem()
RETURNS TABLE (tabela text, linhas bigint)
LANGUAGE plpgsql AS $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'pessoas', 'telefones', 'usuarios', 'usuario_perfis', 'senha_reset_tokens',
        'membros', 'voluntarios', 'beneficiarios', 'atendimentos', 'projetos',
        'projeto_voluntarios', 'projeto_beneficiarios', 'eventos', 'inscricoes',
        'contas_financeiras', 'movimentacoes_financeiras', 'anexos_financeiros', 'patrimonios',
        'auditoria', 'perfis', 'permissoes', 'perfil_permissoes', 'cargos',
        'categorias_financeiras'
    ] LOOP
        tabela := t;
        EXECUTE format('SELECT count(*) FROM %I', t) INTO linhas;
        RETURN NEXT;
    END LOOP;
END $$;

CREATE TEMP TABLE _antes ON COMMIT DROP AS SELECT * FROM pg_temp.contagem();

-- ---------------------------------------------------------------------------------------------
-- 3. Arquivos no Storage que ficarão órfãos
-- ---------------------------------------------------------------------------------------------

\copy (SELECT 'anexos_financeiros' AS pasta, nome_armazenado AS chave FROM anexos_financeiros UNION ALL SELECT 'fotos_pessoas', foto_arquivo FROM pessoas WHERE foto_arquivo IS NOT NULL AND id NOT IN (SELECT pessoa_id FROM _usuarios_manter) ORDER BY 1, 2) TO 'arquivos_para_remover.csv' WITH (FORMAT csv, HEADER)
\echo '== Chaves dos arquivos a remover do Storage gravadas em arquivos_para_remover.csv'

-- ---------------------------------------------------------------------------------------------
-- 4. Exclusão, das folhas para a raiz (todas as FKs são NO ACTION, ver RELACIONAMENTOS.md)
-- ---------------------------------------------------------------------------------------------

-- Trilha e tokens referenciam usuarios.
DELETE FROM auditoria;
DELETE FROM senha_reset_tokens;

-- Financeiro: anexo -> movimentação -> conta.
DELETE FROM anexos_financeiros;
DELETE FROM movimentacoes_financeiras;
\if :manter_contas_bool
  \echo '== contas_financeiras preservadas (manter_contas=sim)'
\else
  DELETE FROM contas_financeiras;
\endif

-- Eventos e projetos.
DELETE FROM inscricoes;
DELETE FROM eventos;
DELETE FROM projeto_voluntarios;
DELETE FROM projeto_beneficiarios;
DELETE FROM atendimentos;
DELETE FROM projetos;
DELETE FROM patrimonios;

-- Papéis das pessoas. Saem inclusive os dos usuários mantidos: o cadastro real de membros,
-- voluntários e beneficiários começa do zero com a associação.
DELETE FROM membros;
DELETE FROM voluntarios;
DELETE FROM beneficiarios;

-- Acesso e pessoas, exceto os usuários mantidos.
DELETE FROM usuario_perfis WHERE usuario_id NOT IN (SELECT id FROM _usuarios_manter);
DELETE FROM usuarios WHERE id NOT IN (SELECT id FROM _usuarios_manter);
DELETE FROM telefones WHERE pessoa_id NOT IN (SELECT pessoa_id FROM _usuarios_manter);
DELETE FROM pessoas WHERE id NOT IN (SELECT pessoa_id FROM _usuarios_manter);

-- Tabelas esvaziadas por completo voltam a numerar do 1 (o primeiro lançamento real é o nº 1).
-- As parcialmente preservadas seguem da numeração atual para não colidir com as linhas mantidas.
SELECT t AS sequencia_reiniciada,
       setval(pg_get_serial_sequence(t, 'id'), 1, false)
FROM unnest(ARRAY[
    'senha_reset_tokens', 'anexos_financeiros', 'movimentacoes_financeiras', 'inscricoes',
    'eventos', 'projeto_voluntarios', 'projeto_beneficiarios', 'atendimentos', 'projetos',
    'patrimonios', 'membros', 'voluntarios', 'beneficiarios', 'auditoria'
]) AS t
WHERE pg_get_serial_sequence(t, 'id') IS NOT NULL;

\if :manter_contas_bool
\else
  SELECT setval(pg_get_serial_sequence('contas_financeiras', 'id'), 1, false)
         AS contas_financeiras_reiniciada
  WHERE pg_get_serial_sequence('contas_financeiras', 'id') IS NOT NULL;
\endif

-- A trilha nova começa registrando a própria limpeza, com o que foi removido.
INSERT INTO auditoria (usuario_id, acao, tabela, registro_id, descricao, dados_anteriores,
                       dados_novos, ip, created_at)
SELECT NULL, 'excluir', NULL, NULL,
       'Limpeza dos dados de teste antes da entrega à associação '
       '(backend/scripts/limpar_dados_de_teste.sql)',
       (SELECT jsonb_object_agg(tabela, linhas) FROM _antes),
       (SELECT jsonb_object_agg(tabela, linhas) FROM pg_temp.contagem()),
       NULL, (now() AT TIME ZONE 'utc');

-- ---------------------------------------------------------------------------------------------
-- 5. Resultado
-- ---------------------------------------------------------------------------------------------

\echo
\echo '== Contagem por tabela'
SELECT a.tabela, a.linhas AS antes, d.linhas AS depois
FROM _antes a
JOIN pg_temp.contagem() d USING (tabela)
ORDER BY a.tabela;

\if :confirmar_bool
  COMMIT;
  \echo '== GRAVADO. Agora remova do Storage os arquivos listados em arquivos_para_remover.csv.'
\else
  ROLLBACK;
  \echo '== ENSAIO: nada foi gravado. Para gravar, rode de novo com -v confirmar=sim.'
\endif
