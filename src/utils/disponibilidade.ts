/** Disponibilidade do voluntário: lista de opções marcáveis sobre um campo de texto livre.
 *
 * O banco guarda uma string só (`Voluntario.disponibilidade`), e continua assim -- trocar
 * por tabela exigiria migration e uma tela de administração para manter a lista. Aqui as
 * opções são montadas a cada abertura: a lista base abaixo mais tudo que já foi usado por
 * algum voluntário. Na prática isso faz a lista crescer sozinha com o uso da associação,
 * que é o que se pede de "opções recorrentes": digitar uma opção nova uma vez a torna
 * marcável para todos os outros daí em diante.
 *
 * O preço dessa escolha: uma opção existe enquanto alguém a usa. Se o único voluntário que
 * marcava "Plantão de feriado" sair, ela some da lista (o histórico de quem já a teve não
 * muda). E um erro de digitação vira uma opção -- daí a comparação abaixo ignorar caixa,
 * acentos e espaço, para pelo menos não duplicar a mesma opção escrita de dois jeitos.
 */

/** Ponto de partida, para a lista não nascer vazia. */
export const OPCOES_BASE = [
  'Manhãs de semana',
  'Tardes de semana',
  'Noites de semana',
  'Sábado de manhã',
  'Sábado à tarde',
  'Domingo',
  'Apenas em eventos pontuais'
];

const SEPARADOR = ', ';

/** Chave de comparação: "Sábado à Tarde" e "sabado a tarde" são a mesma opção. */
export function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/** Quebra o texto guardado nas opções que o compõem. */
export function separarDisponibilidade(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean);
}

export function juntarDisponibilidade(itens: string[]): string {
  return itens.map((i) => i.trim()).filter(Boolean).join(SEPARADOR);
}

/** Une as origens preservando a primeira grafia vista e a ordem de entrada.
 *
 * A ordem importa para a tela não dançar: a lista base primeiro, sempre nas mesmas
 * posições, e só depois o que veio do uso real.
 */
export function montarOpcoes(...origens: string[][]): string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const origem of origens) {
    for (const bruto of origem) {
      const valor = bruto.trim();
      if (!valor) continue;
      const chave = normalizar(valor);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      resultado.push(valor);
    }
  }
  return resultado;
}

/** Marcada ou não, comparando pela chave normalizada. */
export function estaSelecionada(opcao: string, selecionadas: string[]): boolean {
  const chave = normalizar(opcao);
  return selecionadas.some((s) => normalizar(s) === chave);
}

export function alternarOpcao(opcao: string, selecionadas: string[]): string[] {
  if (estaSelecionada(opcao, selecionadas)) {
    const chave = normalizar(opcao);
    return selecionadas.filter((s) => normalizar(s) !== chave);
  }
  return [...selecionadas, opcao.trim()];
}
