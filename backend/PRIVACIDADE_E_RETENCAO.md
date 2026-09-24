# Privacidade e retenção de dados — ACPB

Documento de decisão para a tarefa 39. Cobre classificação de dados, redução de exposição e
política de retenção/exclusão, com referências ao que já está implementado e ao que fica como
recomendação para decisão futura da associação (não código).

## Classificação de dados

| Categoria | Onde vive | Sensibilidade |
|---|---|---|
| Identificação básica | `pessoas` (nome, CPF, RG, data de nascimento, endereço) | Pessoal |
| Contato | `telefones`, `pessoas.email` | Pessoal |
| Credenciais | `usuarios.senha_hash` | Crítico — nunca deve ser exposto (ver abaixo) |
| Dados socioeconômicos sensíveis | `beneficiarios` (renda familiar, composição familiar, necessidades, situação socioeconômica) | Sensível — LGPD trata dado de vulnerabilidade social com cautela |
| Histórico de atendimento social | `atendimentos` (descrição, resultado) | Sensível — pode conter detalhes de saúde, situação familiar, jurídica |
| Dados financeiros institucionais | `movimentacoes_financeiras`, `anexos_financeiros` | Institucional (não pessoal na maior parte, mas comprovantes podem conter dados de terceiros) |
| Trilha de auditoria | `auditoria` (ator, ação, dados antes/depois, IP) | Sensível — é o próprio mecanismo de rastreabilidade, mas o IP é dado pessoal |

## Redução de exposição em respostas (já implementado)

- `UsuarioResponse` nunca inclui `senha_hash` (schema não tem o campo — tarefa 08).
- Tokens de recuperação de senha nunca são retornados por nenhum endpoint nem persistidos em texto
  puro — só o hash SHA-256 fica no banco (tarefa 14).
- `AnexoFinanceiroResponse` nunca expõe `nome_armazenado` (o nome real do arquivo no disco),
  evitando adivinhação de caminho (tarefa 20).
- `model_to_dict` (usado pela auditoria) tem uma lista de campos sempre omitidos
  (`senha_hash`, `token_hash`) mesmo que apareçam em algum model novo no futuro (tarefa 15).

## Redução de exposição em logs (já implementado + decisão)

- Ver a seção "Logs" em `CORS_E_PRODUCAO.md`: segredos nunca são logados. A única exceção
  deliberada e temporária é o token de recuperação de senha, logado enquanto não há provedor de
  e-mail configurado — remover esse log ao integrar um provedor real (tarefa 14).
- Erros 500 não vazam stack trace nem detalhes de schema ao cliente (`tratar_integrity_error`,
  handler de `/health/db` e, desde a implementação do monitoramento, o handler global de
  `Exception` em `app/core/monitoramento.py`) — detalhe técnico fica só no log do servidor. O
  cliente recebe apenas o `X-Request-Id`, que serve para localizar a linha do log e não diz nada
  sobre o erro.
- **Relato de erro para fora do servidor (Sentry), quando `SENTRY_DSN` está configurado:** vai
  deliberadamente pobre — `send_default_pii=False`, corpo de requisição **nunca**
  (`max_request_body_size="never"`) e remoção explícita de `Authorization`, `Cookie` e
  `Set-Cookie` no `before_send`. Sem essas travas, um erro num POST de cadastro levaria CPF e
  endereço para um terceiro junto com o traceback. Sem DSN, nada sai do servidor.
- **Relato de erro de tela (`POST /monitoramento/erro-cliente`):** o navegador envia mensagem,
  caminho e pilha de componentes — nunca conteúdo de formulário. A rota exige usuário autenticado
  e tem limite de chamadas, para não virar canal de poluição do log.

## Acesso a beneficiários

- Já restrito por RBAC (tarefa 11): só perfis com `beneficiarios.visualizar` acessam o módulo —
  hoje Administrador, Gestor, Secretário, Financeiro (leitura) e Coordenador (leitura); Voluntário
  **não tem acesso** a nenhum dado de beneficiário (ver `RBAC.md`).
- **Recomendação não implementada nesta rodada** (gap conhecido, registrado também em `RBAC.md`):
  mesmo perfis com `beneficiarios.visualizar` hoje veem o registro completo, incluindo os campos
  socioeconômicos sensíveis. Uma evolução futura seria uma segunda permissão granular (ex.
  `beneficiarios.visualizar_dados_sensiveis`) que restringe campos como renda familiar e
  necessidades a um subconjunto menor de perfis (Administrador/Gestor), deixando os demais verem
  apenas dados operacionais (nome, status, histórico de contato).

## Retenção e exclusão

| Dado | Regra |
|---|---|
| Cadastro de Pessoa/Membro/Voluntário/Beneficiário | Mantido enquanto a pessoa tiver qualquer vínculo ativo ou histórico relevante (atendimentos, movimentações). Encerramento de vínculo usa os campos de encerramento existentes (`data_saida`, `data_encerramento`, `ativo=false`) em vez de excluir — a exclusão física de `Pessoa` já é bloqueada pelo banco (`RESTRICT`) enquanto houver qualquer registro dependente (tarefa 01/03). |
| Solicitação de exclusão pelo titular (LGPD) | Quando não houver base legal para manter o dado (ex.: pessoa nunca teve vínculo formal, ou vínculo encerrado sem exigência de guarda), a exclusão é feita removendo primeiro os registros dependentes na ordem correta; quando houver obrigação de guarda (ex.: dado usado em lançamento financeiro já reportado), a resposta à solicitação é a anonimização dos campos de identificação, preservando o vínculo numérico para integridade contábil. |
| Registros financeiros e comprovantes | Retidos por, no mínimo, 5 anos (referência comum de guarda contábil/fiscal no Brasil) — a associação deve confirmar o prazo exato com sua contabilidade, pois varia conforme o tipo de obrigação. |
| Trilha de auditoria (`auditoria`) | Não é excluída por rotina — é o registro de o que aconteceu com os demais dados. Retenção alinhada à do dado mais longevo que ela referencia (financeiro: 5+ anos). |
| Tokens de recuperação de senha | Expiram em 30 minutos (tarefa 14); expirados/usados podem ser limpos por rotina periódica (não implementada nesta rodada) sem risco, pois já são inúteis. |
| Anexos financeiros órfãos | Ao excluir uma `MovimentacaoFinanceira`, o backend não teve uma regra de cascata definida para seus anexos nesta rodada — **recomendação**: antes de permitir exclusão de movimentação com anexos, bloquear ou exigir remoção explícita dos anexos primeiro, para não deixar arquivo órfão em disco. |

## Decisões que ficam para a associação (não são deste repositório)

- Prazo exato de guarda de registros financeiros (depende do regime fiscal/contábil da ACPB).
- Se e quando implementar a permissão granular de dados sensíveis de beneficiários sugerida acima.
- Rotina de limpeza de tokens de reset expirados (operacionalmente simples, mas é uma escolha de
  infraestrutura — cron job ou tarefa agendada, não uma mudança de schema).
