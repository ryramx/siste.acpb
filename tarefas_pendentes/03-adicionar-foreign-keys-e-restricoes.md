# 03 — Adicionar chaves estrangeiras e restrições

**Depende de:** 01

Substituir `BigInteger` soltos por colunas com `ForeignKey`, incluindo os vínculos de pessoa, cargo, usuário, perfil, projeto, evento, conta e categoria. Adicionar `UniqueConstraint` nas tabelas N:N e unicidade onde a regra exigir.

**Concluído quando:** o schema impede referências inválidas e vínculos N:N duplicados.
