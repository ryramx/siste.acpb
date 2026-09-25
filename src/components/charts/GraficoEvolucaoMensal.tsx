import React, { useState } from 'react';
import { PontoMensal } from '../../services/dashboardFinanceiroService';
import { useLargura } from './useLargura';
import { marcasDeEixo, moeda, moedaCurta } from './formatos';

interface Props {
  dados: PontoMensal[];
  /** Enquanto recarrega, o gráfico anterior fica visível esmaecido — sem esqueleto e sem
   * salto de layout, porque a troca de período não deveria fazer a tela piscar. */
  recarregando?: boolean;
}

const ALTURA = 260;
const MARGEM = { topo: 12, direita: 12, base: 30, esquerda: 56 };
const LARGURA_MAXIMA_DA_BARRA = 20;
const RAIO = 4;

/** Barra com o topo arredondado e a base reta: o topo é a ponta do dado, a base é a linha
 * zero e arredondá-la sugeriria que a barra não começa onde começa. */
function caminhoDaBarra(x: number, y: number, largura: number, altura: number): string {
  const r = Math.min(RAIO, altura, largura / 2);
  const base = y + altura;
  return [
    `M ${x} ${base}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + largura - r} ${y}`,
    `Q ${x + largura} ${y} ${x + largura} ${y + r}`,
    `L ${x + largura} ${base}`,
    'Z'
  ].join(' ');
}

/** Receitas e despesas mês a mês.
 *
 * Colunas agrupadas, e não linhas, porque a pergunta que a diretoria faz é "neste mês entrou
 * mais do que saiu?" — uma comparação dentro de cada mês, que duas barras lado a lado
 * respondem de relance.
 *
 * As duas cores foram validadas como par: verde e vermelho puros, que seriam o óbvio, ficam a
 * ΔE 1,6 sob deuteranopia — para uma parte dos leitores seriam a mesma cor. O par em uso está
 * na banda que exige codificação secundária, e ela está aqui: legenda, posição fixa (receita
 * sempre à esquerda no par), a dica ao passar o mouse e a tabela equivalente.
 */
export const GraficoEvolucaoMensal: React.FC<Props> = ({ dados, recarregando = false }) => {
  const [container, largura] = useLargura<HTMLDivElement>();
  const [destacado, setDestacado] = useState<number | null>(null);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  const temDados = dados.length > 0;
  const maiorValor = Math.max(0, ...dados.flatMap((d) => [d.receitas, d.despesas]));
  const marcas = marcasDeEixo(maiorValor);
  const topoDaEscala = marcas[marcas.length - 1] || 1;

  const larguraDoPlot = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaDoPlot = ALTURA - MARGEM.topo - MARGEM.base;
  const banda = temDados ? larguraDoPlot / dados.length : 0;
  const larguraDaBarra = Math.max(
    2,
    Math.min(LARGURA_MAXIMA_DA_BARRA, banda / 2 - 3)
  );
  const alturaDe = (valor: number) => (valor / topoDaEscala) * alturaDoPlot;

  // Com muitos meses em tela estreita os rótulos colidem; mostrar um sim, um não é melhor que
  // girar o texto ou deixar virar borrão.
  const passoDoRotulo = banda < 34 ? 2 : 1;

  const ponto = destacado !== null ? dados[destacado] : null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white font-heading">
            Receitas e despesas por mês
          </h3>
          <p className="text-xs text-text-muted">
            Apenas lançamentos confirmados, na data do lançamento.
          </p>
        </div>

        {/* Legenda: identidade nunca depende só da cor. */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-3 h-3 rounded-sm bg-serie-receita" aria-hidden="true" />
            Receitas
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-3 h-3 rounded-sm bg-serie-despesa" aria-hidden="true" />
            Despesas
          </span>
        </div>
      </div>

      {!temDados ? (
        <p className="text-sm text-text-muted py-8 text-center">
          Nenhum lançamento confirmado no período escolhido.
        </p>
      ) : (
        <div
          ref={container}
          className={`relative transition-opacity ${recarregando ? 'opacity-50' : 'opacity-100'}`}
        >
          {largura > 0 && (
            <svg
              width={largura}
              height={ALTURA}
              role="img"
              aria-label={`Gráfico de barras com receitas e despesas de ${dados[0].rotulo} a ${
                dados[dados.length - 1].rotulo
              }. Os mesmos números estão na tabela abaixo do gráfico.`}
            >
              {/* Grade: traço fino, discreto, nunca tracejado. */}
              {marcas.map((marca) => {
                const y = MARGEM.topo + alturaDoPlot - alturaDe(marca);
                return (
                  <g key={marca}>
                    <line
                      x1={MARGEM.esquerda}
                      x2={largura - MARGEM.direita}
                      y1={y}
                      y2={y}
                      className="stroke-surface-border"
                      strokeWidth={1}
                    />
                    <text
                      x={MARGEM.esquerda - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-text-muted"
                      fontSize={11}
                    >
                      {moedaCurta(marca)}
                    </text>
                  </g>
                );
              })}

              {dados.map((d, i) => {
                const centro = MARGEM.esquerda + banda * i + banda / 2;
                // A receita fica sempre à esquerda do par: posição constante é uma segunda
                // pista de identidade, que funciona mesmo para quem não separa as duas cores.
                const xReceita = centro - larguraDaBarra - 1;
                const xDespesa = centro + 1;
                const alturaReceita = alturaDe(d.receitas);
                const alturaDespesa = alturaDe(d.despesas);
                const base = MARGEM.topo + alturaDoPlot;

                return (
                  <g key={`${d.ano}-${d.mes}`}>
                    {destacado === i && (
                      <rect
                        x={MARGEM.esquerda + banda * i}
                        y={MARGEM.topo}
                        width={banda}
                        height={alturaDoPlot}
                        className="fill-surface-card-hover"
                      />
                    )}

                    {d.receitas > 0 && (
                      <path
                        d={caminhoDaBarra(
                          xReceita,
                          base - alturaReceita,
                          larguraDaBarra,
                          alturaReceita
                        )}
                        className="fill-serie-receita"
                      />
                    )}
                    {d.despesas > 0 && (
                      <path
                        d={caminhoDaBarra(
                          xDespesa,
                          base - alturaDespesa,
                          larguraDaBarra,
                          alturaDespesa
                        )}
                        className="fill-serie-despesa"
                      />
                    )}

                    {i % passoDoRotulo === 0 && (
                      <text
                        x={centro}
                        y={ALTURA - 10}
                        textAnchor="middle"
                        className="fill-text-muted"
                        fontSize={11}
                      >
                        {d.rotulo}
                      </text>
                    )}

                    {/* Alvo de toque da banda inteira: ninguém precisa acertar uma barra de
                        20px, e o mesmo alvo recebe o foco pelo teclado. */}
                    <rect
                      x={MARGEM.esquerda + banda * i}
                      y={MARGEM.topo}
                      width={banda}
                      height={alturaDoPlot}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${d.rotulo}: receitas ${moeda(d.receitas)}, despesas ${moeda(
                        d.despesas
                      )}, saldo ${moeda(d.saldo)}`}
                      onMouseEnter={() => setDestacado(i)}
                      onMouseLeave={() => setDestacado(null)}
                      onFocus={() => setDestacado(i)}
                      onBlur={() => setDestacado(null)}
                      className="outline-none focus-visible:stroke-acpb-yellow"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              <line
                x1={MARGEM.esquerda}
                x2={largura - MARGEM.direita}
                y1={MARGEM.topo + alturaDoPlot}
                y2={MARGEM.topo + alturaDoPlot}
                className="stroke-surface-border"
                strokeWidth={1}
              />
            </svg>
          )}

          {ponto && (
            <div
              className="pointer-events-none absolute z-10 bg-surface-bg border border-surface-border rounded-lg px-3 py-2 shadow-lg min-w-40"
              style={{
                left: Math.min(
                  Math.max(MARGEM.esquerda + banda * (destacado ?? 0) + banda / 2 - 80, 0),
                  Math.max(largura - 168, 0)
                ),
                top: 8
              }}
            >
              <p className="text-xs text-text-secondary mb-1">{ponto.rotulo}</p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded bg-serie-receita" aria-hidden="true" />
                {moeda(ponto.receitas)}
              </p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded bg-serie-despesa" aria-hidden="true" />
                {moeda(ponto.despesas)}
              </p>
              <p className="text-xs text-text-muted mt-1">Saldo do mês: {moeda(ponto.saldo)}</p>
            </div>
          )}
        </div>
      )}

      {temDados && (
        <>
          <button
            type="button"
            onClick={() => setMostrarTabela((v) => !v)}
            className="text-xs text-text-secondary hover:text-white underline underline-offset-2 cursor-pointer"
            aria-expanded={mostrarTabela}
          >
            {mostrarTabela ? 'Ocultar a tabela' : 'Ver os mesmos dados em tabela'}
          </button>

          {mostrarTabela && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  Receitas, despesas e saldo por mês no período escolhido
                </caption>
                <thead className="text-text-muted">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Mês</th>
                    <th className="py-1.5 pr-3 font-medium">Receitas</th>
                    <th className="py-1.5 pr-3 font-medium">Despesas</th>
                    <th className="py-1.5 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {dados.map((d) => (
                    <tr key={`${d.ano}-${d.mes}`}>
                      <td className="py-1.5 pr-3 text-text-secondary">{d.rotulo}</td>
                      <td className="py-1.5 pr-3 text-white">{moeda(d.receitas)}</td>
                      <td className="py-1.5 pr-3 text-white">{moeda(d.despesas)}</td>
                      <td className="py-1.5 text-white">{moeda(d.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
