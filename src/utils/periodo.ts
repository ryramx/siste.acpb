/** Período das telas do Financeiro (RQ-07 da rodada de QA de 25/09/2026).
 *
 * Tudo junto numa tela só fazia o administrador perder o controle dos gastos com o passar dos
 * anos. O período mora na URL (`?ano=2026&mes=9`): trocar de aba mantém o que foi escolhido, e
 * um link copiado abre no mesmo período.
 */

export interface Periodo {
  ano: number;
  /** 1 a 12; `null` é o ano inteiro. */
  mes: number | null;
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/** Lê o período da URL. Sem ano (ou com lixo), vale o ano atual e o ano inteiro. */
export function lerPeriodo(params: URLSearchParams, hoje = new Date()): Periodo {
  const ano = Number(params.get('ano'));
  const mes = Number(params.get('mes'));
  return {
    ano: Number.isInteger(ano) && ano >= 1900 && ano <= 2999 ? ano : hoje.getFullYear(),
    mes: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null
  };
}

/** Parâmetros de URL do período, para os links entre as abas. */
export function periodoNaUrl(periodo: Periodo): string {
  const params = new URLSearchParams({ ano: String(periodo.ano) });
  if (periodo.mes) params.set('mes', String(periodo.mes));
  return `?${params.toString()}`;
}

/** "Setembro de 2026" ou "2026", para dizer na tela o que está sendo mostrado. */
export function descreverPeriodo(periodo: Periodo): string {
  return periodo.mes ? `${MESES[periodo.mes - 1]} de ${periodo.ano}` : String(periodo.ano);
}
