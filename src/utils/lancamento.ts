/** Rótulos do formulário de lançamento financeiro.
 *
 * O mesmo modal serve receita e despesa, e os rótulos eram escritos para cobrir os dois de
 * uma vez: "Data de Vencimento/Pagamento" numa receita fala de uma cobrança que a
 * associação teria a pagar, quando o que se registra ali é dinheiro entrando. "Pago /
 * Confirmado" tem o mesmo problema.
 *
 * Aqui o rótulo é escolhido pelo par tipo + status, porque a data significa coisas
 * diferentes nos quatro casos: uma despesa ainda pendente tem vencimento, uma já paga tem
 * data de pagamento, e do lado da receita as duas viram previsão e recebimento.
 */

export type TipoLancamento = 'RECEITA' | 'DESPESA';
export type StatusLancamento = 'CONFIRMADA' | 'PENDENTE';

export function rotuloData(tipo: TipoLancamento, status: StatusLancamento): string {
  if (tipo === 'RECEITA') {
    return status === 'CONFIRMADA' ? 'Data do recebimento' : 'Data prevista do recebimento';
  }
  return status === 'CONFIRMADA' ? 'Data do pagamento' : 'Data de vencimento';
}

/** Rótulos do select de status, que também mudam de lado conforme o tipo. */
export function opcoesStatus(tipo: TipoLancamento): { value: StatusLancamento; label: string }[] {
  return tipo === 'RECEITA'
    ? [
        { value: 'CONFIRMADA', label: 'Recebido' },
        { value: 'PENDENTE', label: 'A receber' }
      ]
    : [
        { value: 'CONFIRMADA', label: 'Pago' },
        { value: 'PENDENTE', label: 'A pagar' }
      ];
}

export function placeholderDescricao(tipo: TipoLancamento): string {
  return tipo === 'RECEITA'
    ? 'Ex.: Contribuição mensal, doação de parceiro'
    : 'Ex.: Fatura de energia da sede';
}
