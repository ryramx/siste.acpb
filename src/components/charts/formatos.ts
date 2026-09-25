/** Formatação de valores para gráficos e tabelas financeiras. */

/** Valor cheio, do jeito que aparece no resto do sistema: R$ 1.234,56. */
export function moeda(valor: number): string {
  // O sinal vem antes do símbolo: "-R$ 600,00", não "R$ -600,00". Saldo negativo é o número
  // que a diretoria mais procura na tela, e ele precisa se ler naturalmente.
  const sinal = valor < 0 ? '-' : '';
  return `${sinal}R$ ${Math.abs(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** Versão curta, para o eixo de valores, onde "R$ 12.500,00" não cabe e nem precisa caber:
 * o número exato está no rótulo da barra, na dica ao passar o mouse e na tabela. */
export function moedaCurta(valor: number): string {
  const absoluto = Math.abs(valor);
  if (absoluto >= 1_000_000) {
    return `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (absoluto >= 1_000) {
    return `${(valor / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Escolhe marcas de eixo em números redondos (1, 2, 5 × potência de 10) acima do maior valor.
 *
 * Um eixo que termina em "R$ 8.437" obriga o leitor a fazer conta para estimar as barras do
 * meio; terminando em 10 mil, cada linha vale um número que se lê de cabeça. */
export function marcasDeEixo(maiorValor: number, quantidade = 4): number[] {
  if (maiorValor <= 0) return [0];

  const passoBruto = maiorValor / quantidade;
  const magnitude = 10 ** Math.floor(Math.log10(passoBruto));
  const normalizado = passoBruto / magnitude;
  const passo = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10) * magnitude;

  const marcas: number[] = [];
  for (let v = 0; v <= maiorValor + passo * 0.001; v += passo) marcas.push(v);
  return marcas;
}
