/** Datas no calendário de quem está usando o sistema.
 *
 * Existe porque o atalho comum, `new Date().toISOString().split('T')[0]`, devolve a data em
 * UTC. No Brasil (UTC−3), das 21h à meia-noite isso já é o dia seguinte: o lançamento feito
 * à noite vinha pré-datado para amanhã, o evento de hoje à noite era tratado como já
 * passado e o filtro "últimos 12 meses" começava no dia 2. Montando a string com os campos
 * locais, a data é a do relógio de quem usa.
 */

/** 'AAAA-MM-DD' de uma data, no fuso local. */
export function isoLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** 'AAAA-MM-DD' de hoje, no fuso local — o formato de `<input type="date">` e da API. */
export function hojeIso(agora: Date = new Date()): string {
  return isoLocal(agora);
}

/** Lê um instante que o servidor gravou em UTC sem marcar o fuso.
 *
 * A auditoria grava `datetime.utcnow()`, que não carrega fuso, e a API devolve
 * '2026-10-05T22:24:41'. Sem marca de fuso, o navegador entende hora *local*, e a tela
 * mostrava todo registro três horas adiantado. Quando a string já traz fuso ('Z' ou
 * '+00:00'), ela é respeitada.
 */
export function instanteUtc(iso: string): Date {
  const temFuso = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(temFuso ? iso : `${iso}Z`);
}
