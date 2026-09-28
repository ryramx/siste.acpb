/** Formatação e contas de dinheiro das telas.
 *
 * Um lugar só para o formato: antes cada tela formatava do seu jeito, e o mesmo valor aparecia
 * como "R$ 1.599,98" num card e "R$ 1599.98" na tabela ao lado.
 *
 * As somas são feitas em centavos inteiros. Os valores chegam da API com duas casas, mas somar
 * `number` direto acumula erro de ponto flutuante (0,1 + 0,2 = 0,30000000000000004).
 */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 1.234,56". O Intl separa "R$" do número com espaço não quebrável, de propósito: o
 * símbolo nunca fica sozinho no fim da linha. */
export function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

/** Valor com sinal na frente, para listas de lançamentos: "+ R$ 10,00" / "- R$ 10,00". */
export function formatarMoedaComSinal(valor: number, positivo: boolean): string {
  return `${positivo ? '+' : '-'} ${formatarMoeda(Math.abs(valor))}`;
}

export function paraCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Soma exata ao centavo. */
export function somarValores(valores: number[]): number {
  return valores.reduce((acc, v) => acc + paraCentavos(v), 0) / 100;
}

/** Data ISO ("2026-09-25", com ou sem hora) para "25/09/2026".
 *
 * Não passa por `new Date`: uma data sem hora é lida como meia-noite UTC, e no fuso de
 * Brasília isso volta para o dia anterior. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export interface Participacao {
  /** "12,34%", ou "< 0,01%" quando o valor existe mas é pequeno demais para aparecer. */
  texto: string;
  /** Largura da barra, em %. A tela dá a ela uma largura mínima quando é maior que zero, para
   * a categoria não sumir. */
  largura: number;
}

const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Quanto `parte` representa de `total`, com duas casas.
 *
 * Arredondar para inteiro fazia uma receita de R$ 0,02 ao lado de uma de R$ 10 bilhões
 * aparecer como 0% e sem barra, como se não existisse. */
export function participacao(parte: number, total: number): Participacao {
  if (total <= 0 || parte <= 0) return { texto: '0,00%', largura: 0 };
  // Em centavos, para a razão não herdar o erro de ponto flutuante das somas.
  const razao = (paraCentavos(parte) / paraCentavos(total)) * 100;
  const texto = razao < 0.005 ? '< 0,01%' : `${PERCENTUAL.format(razao)}%`;
  return { texto, largura: razao };
}
