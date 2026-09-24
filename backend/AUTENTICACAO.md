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

## Troca da própria senha

- `POST /auth/alterar-senha`, com o usuário logado, exigindo a **senha atual** no corpo. Sem essa
  exigência, um token vazado — ou um aparelho emprestado já logado — permitiria tomar a conta em
  definitivo sem conhecer a senha.
- Existe porque o fluxo de recuperação por e-mail resolve **esquecimento**, não a troca deliberada
  de quem desconfia que a senha foi vista; e porque a senha inicial de cada usuário é definida por
  um administrador, o que torna a troca depois do primeiro acesso operação de rotina.
- A troca **invalida os tokens de recuperação pendentes** do usuário. Quem troca a senha por
  desconfiança não ganharia nada se um link de redefinição pedido antes continuasse valendo por
  meia hora.
- A troca **não** derruba as sessões abertas (nem a de quem trocou): JWT é stateless e não há
  blacklist na v1, como registrado acima. Revogar sessões depende do refresh token que a v1 não
  tem — é a mesma decisão adiada em "Logout", e aparece na tela para o usuário não supor que
  trocar a senha expulsa quem estiver em outro aparelho.
- A tentativa com senha atual errada é contada pelo limite descrito abaixo: sem isso a rota
  serviria de oráculo para adivinhar a senha de quem teve o token vazado.

## Limite de tentativas nas rotas públicas

`/auth/login` e `/auth/recuperar-senha` são as únicas rotas que respondem sem token, e até a
implementação do limite aceitavam tentativas ilimitadas. As duas consequências práticas eram
força bruta contra qualquer senha fraca — com CPF e dados de beneficiários atrás da conta — e o
uso da recuperação de senha para inundar a caixa de um usuário e queimar a cota diária do
provedor de e-mail (300 mensagens/dia na Brevo), o que derrubaria a recuperação de **todos**.

| Rota | O que é contado | Limite padrão |
|---|---|---|
| `POST /auth/login` | Apenas as **falhas**, por e-mail e por IP | 5 por e-mail e 20 por IP, em 15 min |
| `POST /auth/recuperar-senha` | **Todas** as chamadas, por e-mail e por IP | 3 por e-mail e 10 por IP, em 60 min |
| `POST /auth/alterar-senha` | Falhas de senha atual, por usuário | 5 em 15 min |

Decisões por trás disso (implementação em `app/core/rate_limit.py`):

- **Dois limites por rota**, porque contêm ataques diferentes: o limite por e-mail pega quem
  martela uma conta de vários lugares; o limite por IP pega quem tenta poucas vezes em muitas
  contas — cinco tentativas em cada um de mil e-mails nunca estouraria a cota de nenhum.
- **Login conta só falha, e o acerto zera a contagem**: quem sabe a senha nunca é barrado por ter
  errado antes. A recuperação conta tudo, porque de fora ela sempre "dá certo" (resposta idêntica
  exista ou não o e-mail) e o custo a conter é o e-mail enviado.
- **A recuperação registra a tentativa antes de saber se o e-mail existe.** O contrário
  transformaria o 429 em sinal de que a conta existe — exatamente a enumeração que a resposta
  idêntica evita.
- **Efeito colateral aceito:** cinco senhas erradas bloqueiam aquele e-mail por até 15 minutos,
  então é possível atrapalhar de propósito o login de alguém cujo e-mail se conheça. É um atraso,
  não um bloqueio permanente, e o inverso — não ter limite — é pior.
- **Contador em memória, por processo.** Com mais de um worker o limite efetivo se multiplica pelo
  número de workers, e um redeploy zera a contagem. Hoje a API roda em um único processo no
  Render, então o limite vale como escrito; nenhuma das ressalvas ajuda um atacante real, que não
  reinicia o servidor. A alternativa (contador no banco ou em Redis) custa uma escrita por
  tentativa, que é justamente o que um ataque produz em volume.

## Usuário inativo

- Login (`POST /auth/login`) recusa credenciais de usuário com `ativo=false`, com mensagem genérica
  (não revela se o e-mail existe ou se a conta está inativa) para evitar enumeração de contas.
- Qualquer rota protegida também recusa (401/403) um token válido cujo usuário tenha sido
  desativado após a emissão do token, pela checagem em tempo real descrita acima.

## Segredos

- Nenhum segredo (senha de banco, `JWT_SECRET_KEY`) é versionado. Todos vêm de `.env` (fora do git)
  ou de variáveis de ambiente do serviço de deploy. `.env.example` documenta as chaves esperadas
  sem valores reais sensíveis.
