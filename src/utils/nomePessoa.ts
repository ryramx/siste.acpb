/** Validação de nome de gente, igual à do backend (backend/app/schemas/nome_pessoa.py).
 *
 * O cadastro aceitava "123123123" como nome completo. Vale para nome da pessoa, da mãe, do pai
 * e do responsável; nunca para nome de bem, categoria ou descrição ("Notebook 2" é legítimo).
 */

const TAMANHO_MINIMO = 3;
const LETRAS = 'A-Za-zÀ-ÖØ-öø-ÿ';
const NOME = new RegExp(`^[${LETRAS}]+(?:(?: |-|'|’| '|' )[${LETRAS}]+)*$`);

/** Mensagem de erro para mostrar no campo, ou `undefined` se o nome serve.
 *
 * Campo opcional em branco é aceito; o obrigatório em branco fica com o `required` do campo. */
export function erroNomePessoa(valor: string | null | undefined, campo = 'O nome'): string | undefined {
  const nome = (valor ?? '').replace(/\s+/g, ' ').trim();
  if (!nome) return undefined;
  if (nome.length < TAMANHO_MINIMO) return `${campo} precisa ter ao menos ${TAMANHO_MINIMO} letras`;
  if (!NOME.test(nome)) return `${campo} só pode ter letras, espaço, hífen e apóstrofo`;
  return undefined;
}
