/** Idade e maioridade a partir da data de nascimento.
 *
 * Existe porque o campo de responsável legal só faz sentido para menores: mostrá-lo sempre
 * poluiria o cadastro da maioria, que é adulta, e escondê-lo por completo deixaria de fora
 * as crianças e adolescentes que a associação atende nos projetos.
 *
 * A conta é feita por comparação de data, e não dividindo dias por 365: quem faz 18 anos
 * hoje é maior hoje, e a divisão erraria esse caso por causa dos anos bissextos.
 */

export const MAIORIDADE = 18;

/** Anos completos na data de referência. Devolve null quando não há data utilizável. */
export function idadeEmAnos(nascimento: string | null | undefined, hoje: Date = new Date()): number | null {
  if (!nascimento) return null;
  // A data vem como 'AAAA-MM-DD' da API. `new Date('2008-05-10')` seria interpretada como
  // UTC e, em fuso negativo como o do Brasil, voltaria um dia -- o que erraria a idade de
  // quem nasceu no dia 1º. Por isso os componentes são lidos à mão.
  const partes = nascimento.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) return null;
  const [ano, mes, dia] = partes;

  let anos = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) anos -= 1;

  return anos >= 0 ? anos : null;
}

/** Data de nascimento ausente devolve `false`: sem o dado não se afirma que é menor, e o
 * campo de responsável fica escondido até a data ser informada. */
export function ehMenorDeIdade(nascimento: string | null | undefined, hoje: Date = new Date()): boolean {
  const idade = idadeEmAnos(nascimento, hoje);
  return idade !== null && idade < MAIORIDADE;
}
