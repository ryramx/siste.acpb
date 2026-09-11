# Política de autenticação — ACPB

Documento de decisão para a tarefa 07. As decisões aqui viram configuração de código nas
tarefas 08-11 e devem ser respeitadas nas implementações seguintes.

## Mecanismo

- **JWT (JSON Web Token)** assinado com algoritmo **HS256** (chave simétrica), suficiente para um
  backend único que também é o único emissor/consumidor do token.
- Chave de assinatura vem da variável de ambiente `JWT_SECRET_KEY`, **sem valor padrão inseguro em
  produção**: a aplicação falha ao subir se a variável estiver vazia quando `ENVIRONMENT=production`
  (ver tarefa 37). Em desenvolvimento local, `.env.example` documenta um valor de exemplo que nunca
  deve ir para produção.
- Algoritmo configurável via `JWT_ALGORITHM` (padrão `HS256`), guardado como constante de
  configuração para facilitar rotação futura para chave assimétrica (RS256), se necessário.

## Duração e renovação

- **Access token único, sem refresh token na v1.** Duração de **8 horas** (`JWT_EXPIRE_MINUTES=480`),
  cobrindo um dia de trabalho.
- **Justificativa:** o sistema tem poucos usuários internos (equipe da associação), não um público
  externo; a complexidade adicional de refresh token/rotação não se paga no escopo inicial. Quando o
  token expirar, o frontend redireciona para o login (tarefa 27).
- Reavaliar esta decisão se o sistema crescer para múltiplos dispositivos/sessões concorrentes por
  usuário ou exigir sessões mais longas.

## Logout

- **Logout é responsabilidade do cliente**: o frontend descarta o token armazenado (tarefa 27). Não
  há blacklist de tokens no servidor na v1 — aceito como risco residual dado o tempo de expiração
  curto (8h) e o público interno e de confiança do sistema.
- Se no futuro for necessário revogar um token antes da expiração (ex.: usuário demitido), a via
  imediata é desativar o usuário (`usuarios.ativo=false`): `get_current_user` (tarefa 10) **sempre
  consulta o estado atual do usuário no banco**, não confia apenas no payload do JWT, então a
  desativação tem efeito imediato mesmo com um token ainda válido.

## Reset de senha

- Token de uso único, aleatório (não é um JWT), armazenado com hash no banco, associado a um
  usuário e com expiração curta (**30 minutos**). Ver detalhamento na tarefa 14.
- Um token usado ou expirado é rejeitado e não pode ser reaproveitado.

## Usuário inativo

- Login (`POST /auth/login`) recusa credenciais de usuário com `ativo=false`, com mensagem genérica
  (não revela se o e-mail existe ou se a conta está inativa) para evitar enumeração de contas.
- Qualquer rota protegida também recusa (401/403) um token válido cujo usuário tenha sido
  desativado após a emissão do token, pela checagem em tempo real descrita acima.

## Segredos

- Nenhum segredo (senha de banco, `JWT_SECRET_KEY`) é versionado. Todos vêm de `.env` (fora do git)
  ou de variáveis de ambiente do serviço de deploy. `.env.example` documenta as chaves esperadas
  sem valores reais sensíveis.
