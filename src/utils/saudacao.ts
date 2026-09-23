/** Saudação do cabeçalho do dashboard, de acordo com a hora do usuário.
 *
 * A faixa da noite atravessa a meia-noite (18h às 4h59), por isso ela é o `else` das
 * outras duas em vez de uma comparação própria — evita o buraco entre 23h59 e 00h00.
 *
 * As frases de apoio são só um agrado: a hora escolhe o conjunto, e o chamador escolhe
 * qual delas usar. `fraseDoMomento` sorteia uma; quem precisa de resultado previsível
 * (teste, por exemplo) passa o índice.
 */

export type PeriodoDoDia = 'manha' | 'tarde' | 'noite';

export function periodoDoDia(agora: Date = new Date()): PeriodoDoDia {
  const hora = agora.getHours();
  if (hora >= 5 && hora < 12) return 'manha';
  if (hora >= 12 && hora < 18) return 'tarde';
  return 'noite';
}

export function saudacao(agora: Date = new Date()): string {
  switch (periodoDoDia(agora)) {
    case 'manha':
      return 'Bom dia';
    case 'tarde':
      return 'Boa tarde';
    case 'noite':
      return 'Boa noite';
  }
}

const FRASES: Record<PeriodoDoDia, string[]> = {
  manha: [
    'O café já está esfriando — aqui está o resumo da Associação Cristã Pau-Brasil.',
    'Dia novo, números novos. Veja como anda a Associação Cristã Pau-Brasil.',
    'Começando cedo, né? Este é o resumo da Associação Cristã Pau-Brasil.'
  ],
  tarde: [
    'Metade do dia vencida. Aqui está o resumo da Associação Cristã Pau-Brasil.',
    'Hora do cafezinho e de olhar os números da Associação Cristã Pau-Brasil.',
    'Enquanto a tarde não acaba, veja o resumo da Associação Cristã Pau-Brasil.'
  ],
  noite: [
    'Fechando o dia — aqui está o resumo da Associação Cristã Pau-Brasil.',
    'A essa hora só os dedicados. Este é o resumo da Associação Cristã Pau-Brasil.',
    'Último olhar no dia: o resumo da Associação Cristã Pau-Brasil.'
  ]
};

export function fraseDoMomento(agora: Date = new Date(), indice?: number): string {
  const frases = FRASES[periodoDoDia(agora)];
  const escolhido = indice ?? Math.floor(Math.random() * frases.length);
  return frases[escolhido % frases.length];
}
