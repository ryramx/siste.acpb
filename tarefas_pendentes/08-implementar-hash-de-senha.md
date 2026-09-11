# 08 — Implementar hash de senha

**Depende de:** 07

Adicionar dependência segura de hash (por exemplo, `pwdlib`/Argon2 ou bcrypt), helpers para criar/verificar hashes e nunca expor `senha_hash` nos schemas de resposta.

**Concluído quando:** senha válida é verificada e senha em texto puro não é persistida.
