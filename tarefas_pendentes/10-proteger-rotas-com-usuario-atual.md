# 10 — Proteger rotas com usuário atual

**Depende de:** 09

Criar `get_current_user`, validar Bearer token e proteger todas as rotas de negócio. Manter apenas health e login públicos conforme política definida.

**Concluído quando:** uma chamada sem token recebe 401 e com token válido identifica o usuário.
