# Limpeza dos dados de teste antes da entrega — ACPB

Plano para zerar os dados de teste do banco de produção (Neon) e dos arquivos (Storage) antes de a
associação começar a usar o sistema de verdade. O script é `scripts/limpar_dados_de_teste.sql`.
**Nada disto foi executado em produção**: o plano e o script estão aqui para aprovação.

## O que fica e o que sai

| Tabela | Destino | Por quê |
|---|---|---|
| `perfis`, `permissoes`, `perfil_permissoes` | **Fica** | Matriz de acesso (RBAC.md), semeada por migration. Sem ela ninguém tem permissão para nada. |
| `cargos` | **Fica** | Cargos padrão semeados por migration; a tela de Cargos é só leitura. |
| `categorias_financeiras` | **Fica** | As 20 categorias do PRD, semeadas por migration. |
| `alembic_version` | **Fica** | Controle de migrations. Apagar faria o próximo deploy tentar recriar o banco. |
| `usuarios`, `usuario_perfis`, `pessoas`, `telefones` | **Fica só quem for listado em `manter_emails`** | O(s) administrador(es) que vão operar o sistema, com a própria pessoa, telefones e perfis. Todo o resto sai. |
| `contas_financeiras` | **Sai** (padrão) | Configurável: `-v manter_contas=sim` preserva, se as contas cadastradas já forem as reais. |
| `movimentacoes_financeiras`, `anexos_financeiros` | **Sai** | Lançamentos de teste. Os comprovantes no Storage saem à parte (ver abaixo). |
| `auditoria` | **Sai** | A trilha dos testes não tem valor para a associação. A trilha nova começa com uma linha registrando a própria limpeza e quantas linhas havia em cada tabela. |
| `senha_reset_tokens` | **Sai** | Tokens de teste, já inúteis. |
| `membros`, `voluntarios`, `beneficiarios`, `atendimentos` | **Sai** | Inclusive os papéis dos usuários mantidos: o cadastro real começa do zero. |
| `projetos`, `projeto_voluntarios`, `projeto_beneficiarios`, `eventos`, `inscricoes` | **Sai** | |
| `patrimonios` | **Sai** | |

As tabelas esvaziadas por completo voltam a numerar do 1 (o primeiro lançamento real é o nº 1).
`pessoas`, `usuarios`, `usuario_perfis` e `telefones` continuam da numeração atual, para não colidir
com as linhas mantidas.

## Ordem de exclusão

Todas as chaves estrangeiras são `NO ACTION` (RELACIONAMENTOS.md), então a ordem é das folhas
para a raiz:

1. `auditoria`, `senha_reset_tokens` (apontam para `usuarios`)
2. `anexos_financeiros` → `movimentacoes_financeiras` → `contas_financeiras`
3. `inscricoes` → `eventos`
4. `projeto_voluntarios`, `projeto_beneficiarios`, `atendimentos` → `projetos`
5. `patrimonios`
6. `membros`, `voluntarios`, `beneficiarios`
7. `usuario_perfis` → `usuarios` → `telefones` → `pessoas` (exceto os mantidos)

## Travas do script

- **Ensaio por padrão.** Apaga dentro de uma transação, mostra antes/depois e dá `ROLLBACK`. Só
  grava com `-v confirmar=sim`.
- Para, sem alterar nada, se: `manter_emails` não for informado; algum e-mail não existir; nenhum
  dos mantidos for Administrador ativo; ou existir no banco alguma tabela que o script não
  conhece (o banco de produção é anterior a este repositório).
- Trava as tabelas durante a execução, para nenhum cadastro feito pela tela no meio do caminho
  ficar pela metade.
- Pode ser rodado de novo sem problema: na segunda vez só não há o que apagar.

Testado num Postgres 16 local com todas as migrations e ao menos uma linha em cada tabela: ensaio,
cada uma das travas, gravação com e sem `manter_contas`, e uma segunda execução.

## Passo a passo no dia

1. **Backup antes.** Rodar o workflow de backup sob demanda (aba Actions → backup → Run workflow) e
   conferir que o dump do dia apareceu. É a volta atrás se algo der errado.
2. **Ensaio** (precisa de `psql` 10 ou mais novo; a URL é a `DATABASE_URL` do Render):

   ```bash
   cd backend
   psql "$DATABASE_URL" -v manter_emails='admin@acpb.org.br' -f scripts/limpar_dados_de_teste.sql
   ```

   Conferir a lista de usuários mantidos e a tabela de contagem antes/depois.
3. **Execução**, o mesmo comando com `-v confirmar=sim` (e `-v manter_contas=sim`, se for o caso).
4. **Arquivos no Storage.** O script gera `arquivos_para_remover.csv` (pasta e chave de cada
   comprovante e foto cujo registro foi apagado). Com as variáveis `S3_*` da API no Render
   (`AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` recebem `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`):

   ```bash
   tail -n +2 arquivos_para_remover.csv | while IFS=, read -r pasta chave; do
     aws s3 rm "s3://$S3_BUCKET/$pasta/$chave" --endpoint-url "$S3_ENDPOINT_URL" --region "$S3_REGION"
   done
   ```

5. **Conferir pela tela:** entrar com o administrador mantido, ver Pessoas com só ele, Financeiro
   zerado e a linha da limpeza em Auditoria.

## Decisões para aprovar

- **Quem fica:** quais e-mails vão em `manter_emails`. A conta de desenvolvimento (marcada como
  conta técnica) só fica se o e-mail dela estiver na lista.
- **Contas financeiras:** apagar (padrão) ou manter.
- **Backups antigos:** os dumps diários, semanais e mensais anteriores e o espelho de arquivos
  continuam guardando os dados de teste pelo prazo de retenção (até 24 meses no mensal). Sugestão:
  manter o backup do dia da limpeza como garantia e apagar os anteriores depois que a associação
  aceitar a entrega.
