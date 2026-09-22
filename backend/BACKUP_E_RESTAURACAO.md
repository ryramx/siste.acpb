# Backup e restauração — PostgreSQL (ACPB)

Documento de decisão para a tarefa 36. Cobre o banco `acpb_db` (produção e desenvolvimento) e os
arquivos de anexos financeiros em `backend/storage/` (tarefa 20), que não estão no banco e por isso
precisam de backup próprio.

## Periodicidade e retenção

| Tipo | Frequência | Retenção |
|---|---|---|
| Backup completo do banco (`pg_dump`, formato custom `-F c`) | Diário, fora do horário de uso (madrugada) | 30 dias rolantes |
| Backup completo do banco | Semanal (aos domingos) | 6 meses |
| Backup completo do banco | Mensal (dia 1) | 24 meses (obrigação legal/contábil de guarda de registros financeiros) |
| Arquivos de anexos financeiros (`backend/storage/anexos_financeiros/`) | Diário, junto com o backup do banco | Mesma retenção do backup diário/semanal/mensal correspondente |

Justificativa da retenção de 24 meses nos backups mensais: o sistema guarda movimentações
financeiras e comprovantes que a associação pode precisar apresentar em prestação de contas ou
auditoria externa muito depois do lançamento original.

## Criptografia

- Backup gerado com `pg_dump -F c` (formato binário comprimido, já reduz exposição de texto puro).
- Arquivo de backup é criptografado em repouso com `age` (ou `gpg -c`, cifra simétrica) antes de sair
  da máquina/servidor de origem — a senha/chave de criptografia é armazenada separadamente do
  destino do backup (nunca junto no mesmo local de armazenamento).
- Backups em trânsito (upload para armazenamento externo) usam conexão com TLS.

## Local de armazenamento

- Cópia local: no próprio servidor de banco, em disco separado do volume de dados (`/var/backups/acpb/`),
  apenas para restauração rápida de curto prazo (últimos 2-3 dias).
- Cópia externa (offsite): enviada diariamente para armazenamento fora do servidor de produção
  (ex.: bucket de object storage de outro provedor/região). **Nunca depender só do backup local** —
  se o servidor for perdido, o backup local vai junto.
- Regra 3-2-1 como referência: pelo menos 3 cópias, em 2 mídias/locais diferentes, sendo 1 fora do
  local de produção.

## Responsável

- Um responsável técnico nomeado (ex.: o desenvolvedor/administrador de infraestrutura da ACPB) é
  o dono do processo de backup: garante que os jobs rodam, que os alertas de falha chegam a alguém, e
  executa o teste de restauração periódico (ver abaixo).
- Em caso de ausência do responsável principal, um segundo contato deve saber onde estão os backups
  e como restaurá-los (documentado neste arquivo + credenciais em cofre de senhas da associação).

## Alerta de falha

- O job de backup (script/cron) registra sucesso/falha em log e **falha ruidosamente**: se o
  `pg_dump` retornar código de saída diferente de zero, ou se o arquivo gerado tiver tamanho zero ou
  muito menor que o backup anterior (heurística de "backup vazio"), o job deve notificar o
  responsável (e-mail ou mensagem instantânea) imediatamente — não é aceitável descobrir uma falha
  de backup só quando for tarde para restaurar.
- Um backup ausente por mais de 48h deve gerar alerta separado (job de monitoramento verificando a
  data de modificação do último arquivo de backup).

## Teste de restauração

- **Trimestral**, no mínimo: restaurar o backup mais recente em um banco separado (nunca sobrepor o
  banco de produção) e validar:
  1. `pg_restore` completa sem erros.
  2. Contagem de linhas das tabelas principais (`pessoas`, `usuarios`, `movimentacoes_financeiras`)
     é consistente com o esperado.
  3. A aplicação sobe apontando para o banco restaurado e os fluxos críticos (login, listar membros,
     listar movimentações) funcionam.
- Resultado do teste (sucesso/falha, data, quem executou) é registrado — um backup nunca testado é,
  na prática, um backup cuja integridade é desconhecida.

## Comandos de referência

Backup:
```bash
pg_dump -h <host> -p 5432 -U acpb_app -d acpb_db -F c -f acpb_db_$(date +%Y%m%d).dump
age -e -i /caminho/para/chave.txt -o acpb_db_$(date +%Y%m%d).dump.age acpb_db_$(date +%Y%m%d).dump
```

Restauração (em um banco vazio dedicado a teste, nunca em produção sem confirmação explícita):
```bash
age -d -i /caminho/para/chave.txt -o acpb_db_restaurar.dump acpb_db_AAAAMMDD.dump.age
createdb -h <host> -U acpb_app acpb_db_teste_restauracao
pg_restore -h <host> -U acpb_app -d acpb_db_teste_restauracao acpb_db_restaurar.dump
```

## Estado da automação

O backup **diário do banco** está automatizado em `.github/workflows/backup.yml`: `pg_dump -F c`,
verificação de tamanho, criptografia simétrica e envio para armazenamento externo, com retenção de
30 dias. Roda às 06:00 UTC e também sob demanda pela aba Actions.

Ele só funciona depois que os segredos do repositório forem preenchidos (a lista está no cabeçalho
do workflow). Enquanto não estiverem, o job **falha todo dia, de propósito** — um backup silencioso
que não roda é pior do que nenhum, porque passa a impressão de que existe.

### O que mudou em relação à política acima

A política foi escrita supondo servidor próprio: cópia local em `/var/backups/acpb/` e anexos em
`backend/storage/`. A produção real é outra — Render com disco efêmero, banco no Neon e anexos no
Supabase Storage. Consequências:

- **Não há cópia local.** O disco do Render não sobrevive a um restart, então guardar backup nele
  seria ilusão. O backup nasce direto fora do provedor do banco, que é o que a regra 3-2-1 pede.
- **A criptografia usa `gpg -c` (AES256)**, não `age`: `gpg` já existe no runner, e trocar a
  ferramenta evitaria instalar uma dependência só para isso. Os comandos de referência acima
  continuam válidos para restauração manual, trocando `age -d` por
  `gpg --decrypt --output <arquivo>.dump <arquivo>.dump.gpg`.

### Pendente

- **Anexos financeiros e fotos no Supabase Storage não têm backup.** Ficam fora do banco, então o
  `pg_dump` não os alcança — as movimentações seriam restauradas sem os comprovantes. Falta decidir
  entre replicar o bucket para outro provedor ou baixá-lo junto no mesmo workflow.
- **Backups semanais (6 meses) e mensais (24 meses)** previstos na tabela de retenção: só o diário
  está automatizado. O mensal é o que atende à guarda de 24 meses dos registros financeiros.
- **Alerta de backup ausente por mais de 48h.** Hoje a falha aparece como job vermelho no GitHub,
  que notifica quem estiver inscrito no repositório; não há verificação independente de que o
  último arquivo é recente.
- **Teste de restauração trimestral** continua sendo processo humano, e nunca foi executado.
