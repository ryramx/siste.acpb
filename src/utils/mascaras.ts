/** Formatação de CPF, telefone, CEP e valor em reais.
 *
 * O banco guarda **somente dígitos**; a máscara é responsabilidade da exibição. Misturar
 * "50000-000" e "50000000" na mesma coluna tornaria busca e comparação pouco confiáveis,
 * e é o tipo de inconsistência que só aparece muito depois, quando já há dados dos dois
 * formatos.
 *
 * Por isso cada formato tem duas funções: uma que aplica a máscara (para o que o usuário
 * vê) e `apenasDigitos`, aplicada antes de enviar para a API.
 *
 * As funções de máscara aceitam entrada parcial de propósito — são usadas a cada tecla
 * digitada, quando o valor ainda está incompleto.
 */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** 000.000.000-00 */
export function formatarCPF(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** (00) 00000-0000 para celular, (00) 0000-0000 para fixo.
 *
 * O ponto de corte do hífen só é decidido no 11º dígito: até lá não dá para saber se o
 * número é fixo ou celular, então a máscara segue o formato de fixo enquanto couber. */
export function formatarTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 00000-000 */
export function formatarCEP(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Versões para exibição: devolvem string vazia quando não há valor, em vez de uma máscara
 * pela metade. Uma tela que mostra "(" ou "-" sozinho por causa de um campo vazio é pior
 * que uma que não mostra nada. */
export function exibirCPF(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  return d.length === 11 ? formatarCPF(d) : (valor ?? '');
}

export function exibirTelefone(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  return d.length === 10 || d.length === 11 ? formatarTelefone(d) : (valor ?? '');
}

export function exibirCEP(valor: string | null | undefined): string {
  const d = apenasDigitos(valor ?? '');
  return d.length === 8 ? formatarCEP(d) : (valor ?? '');
}

/** Validação de CPF pelos dígitos verificadores.
 *
 * Rejeita também os casos de todos os dígitos iguais (111.111.111-11 e afins), que passam
 * na conta dos verificadores mas nunca são CPFs reais. */
export function cpfValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digitoVerificador = (ateIndice: number): number => {
    let soma = 0;
    let peso = ateIndice + 2;
    for (let i = 0; i < ateIndice + 1; i++) {
      soma += Number(d[i]) * peso;
      peso--;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digitoVerificador(8) === Number(d[9]) && digitoVerificador(9) === Number(d[10]);
}

/** Valor em reais, preenchido da direita para a esquerda.
 *
 * É o comportamento dos aplicativos de banco: cada dígito digitado empurra os anteriores,
 * então "1" é R$ 0,01, "12" é R$ 0,12 e "12345" é R$ 123,45. A vírgula nunca é digitada,
 * o que elimina a dúvida de onde ela vai e o caso em que a pessoa escreve "150" querendo
 * cento e cinquenta reais e o sistema entende cento e cinquenta centavos -- ou o contrário.
 *
 * O campo `type="number"` que existia antes também aceitava "020" e "1e5", e no celular
 * abria o teclado com setas de incremento em vez do teclado numérico simples.
 */

/** Teto de 12 dígitos: R$ 9.999.999.999,99. Sem limite, colar um texto longo geraria um
 * número que perde precisão em ponto flutuante antes mesmo de chegar ao servidor. */
const MAXIMO_DIGITOS_VALOR = 12;

/** Recebe o que a pessoa digitou e devolve a máscara pronta, sempre com os centavos. */
export function formatarValor(valor: string): string {
  const d = apenasDigitos(valor).slice(0, MAXIMO_DIGITOS_VALOR);
  if (!d) return '';
  const centavos = d.padStart(3, '0');
  const reais = centavos.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decimais = centavos.slice(-2);
  return `${reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimais}`;
}

/** Da máscara para o número que o backend recebe. Campo vazio vale zero. */
export function valorParaNumero(mascarado: string): number {
  const d = apenasDigitos(mascarado).slice(0, MAXIMO_DIGITOS_VALOR);
  if (!d) return 0;
  return Number(d) / 100;
}

/** Do número guardado para a máscara, ao abrir um formulário de edição.
 *
 * Arredonda antes de formatar porque um valor vindo do banco pode chegar como 12.345000001
 * em ponto flutuante, e truncar exibiria um centavo a menos.
 *
 * Zero sai vazio, e não "0,00": um campo obrigatório ainda em branco não deve parecer
 * preenchido, nem no cadastro novo nem numa edição cujo valor foi apagado.
 */
export function numeroParaValor(valor: number | null | undefined): string {
  if (!valor || Number.isNaN(valor)) return '';
  return formatarValor(String(Math.round(valor * 100)));
}
