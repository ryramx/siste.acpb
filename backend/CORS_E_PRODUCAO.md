# CORS e configuração de produção

Documento de decisão para a tarefa 37.

## Ambientes

- `ENVIRONMENT` (`.env`) distingue `development` (padrão) de `production`. Em produção, a
  aplicação **falha ao subir** (não apenas loga um aviso) se qualquer uma destas faltar ou estiver
  insegura — ver `app/core/config.py::_validar_configuracao_producao` e os testes em
  `tests/test_config_producao.py`:
  - `JWT_SECRET_KEY` vazio.
  - `DATABASE_PASSWORD` vazio.
  - `BACKEND_CORS_ORIGINS` vazio ou contendo `*` (origem ampla).

## CORS — apenas origens conhecidas

- `BACKEND_CORS_ORIGINS` é uma lista separada por vírgula das origens do frontend autorizadas
  (ex.: `https://gestao.acpb.org.br`). Em desenvolvimento, `http://localhost:5173`.
- **Nunca** usar `allow_origins=["*"]` em produção — por isso a validação acima rejeita `*`
  explicitamente. Uma origem ampla combinada com `allow_credentials=True` (usado pelo
  `CORSMiddleware` em `app/main.py`) é uma configuração insegura que o navegador nem aceita
  corretamente, e que exporia a API a qualquer site.
- Ambientes de homologação/staging devem ter sua própria origem cadastrada, nunca reaproveitar a
  lista de produção "por praticidade".

## HTTPS e cookies

- A API não usa cookies de sessão — a autenticação é via header `Authorization: Bearer <token>`
  (ver `AUTENTICACAO.md`), armazenado pelo frontend em `localStorage`, não em cookie. Isso elimina a
  superfície de CSRF baseada em cookie (não há cookie enviado automaticamente pelo navegador em
  requisições cross-site), mas exige que o frontend proteja o `localStorage` contra XSS — reforça a
  importância de manter dependências do frontend atualizadas e nunca renderizar HTML não sanitizado
  vindo de dados do usuário.
- Produção **deve** rodar atrás de HTTPS (terminação TLS no proxy/load balancer ou diretamente no
  servidor ASGI). Sem HTTPS, o token Bearer trafega em texto claro e pode ser interceptado.
- Se no futuro a autenticação migrar para cookies (ex.: para suportar SSR), reavaliar esta seção:
  cookies precisariam de `Secure`, `HttpOnly` e `SameSite=Strict`/`Lax`, e aí sim CSRF token entra em
  jogo.

## Segredos JWT

- `JWT_SECRET_KEY` nunca é versionado; gerado por ambiente com
  `python -c "import secrets; print(secrets.token_urlsafe(64))"` (ver `.env.example`).
- Rotação de chave: trocar `JWT_SECRET_KEY` invalida instantaneamente todos os tokens emitidos
  (usuários precisam logar novamente) — aceitável dado o `JWT_EXPIRE_MINUTES` curto (8h). Rotacionar
  imediatamente se houver suspeita de vazamento.

## Logs

- Nunca logar `senha`, `senha_hash`, `access_token` ou o corpo de requisições de autenticação em
  texto claro. O log de recuperação de senha (`app/api/routes/auth.py::solicitar_recuperacao_senha`)
  é uma exceção deliberada e temporária enquanto não há provedor de e-mail configurado (ver tarefa
  14) — remover esse log assim que o envio de e-mail for implementado.
- Erros inesperados (500) devem ser logados no servidor com detalhes técnicos, mas a resposta ao
  cliente permanece genérica (já é o padrão em `health.py` e nas rotas que usam
  `tratar_integrity_error`) — não vazar stack trace nem detalhes de schema/banco para o cliente.

## Variáveis de ambiente obrigatórias em produção

| Variável | Obrigatória em produção | Observação |
|---|---|---|
| `DATABASE_PASSWORD` | Sim | Nunca vazio |
| `JWT_SECRET_KEY` | Sim | Nunca vazio, único por ambiente |
| `BACKEND_CORS_ORIGINS` | Sim | Lista explícita, sem `*` |
| `ENVIRONMENT` | Sim | `production` |
| `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`, `RESET_PASSWORD_TOKEN_EXPIRE_MINUTES` | Não | Têm padrão razoável, mas revisar por ambiente |
| `ANEXOS_STORAGE_DIR`, `ANEXOS_TAMANHO_MAXIMO_MB` | Não | Ajustar caminho para um disco persistente em produção |
