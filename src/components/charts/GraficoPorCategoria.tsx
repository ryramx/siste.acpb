import React, { useState } from 'react';
import { TotalPorCategoria } from '../../services/dashboardFinanceiroService';
import { useLargura } from './useLargura';
import { moeda } from './formatos';
import { participacao } from '../../utils/dinheiro';

interface Props {
  titulo: string;
  subtitulo: string;
  dados: TotalPorCategoria[];
  tipo: 'RECEITA' | 'DESPESA';
  recarregando?: boolean;
}

const ALTURA_DA_LINHA = 30;
const ALTURA_DA_BARRA = 16;
const RAIO = 4;
const LARGURA_DO_ROTULO = 116;
/** Quantas categorias aparecem antes de "Ver todas". Despesas tem 15 no cadastro padrão, e a
 * lista inteira empurrava o resto do dashboard para baixo. */
export const CATEGORIAS_VISIVEIS = 5;

function caminhoDaBarra(x: number, y: number, largura: number, altura: number): string {
  const r = Math.min(RAIO, largura, altura / 2);
  return [
    `M ${x} ${y}`,
    `L ${x + largura - r} ${y}`,
    `Q ${x + largura} ${y} ${x + largura} ${y + r}`,
    `L ${x + largura} ${y + altura - r}`,
    `Q ${x + largura} ${y + altura} ${x + largura - r} ${y + altura}`,
    `L ${x} ${y + altura}`,
    'Z'
  ].join(' ');
}

/** Composição por categoria: barras horizontais, da maior para a menor.
 *
 * Barra e não pizza: comparar comprimento é mais preciso que comparar ângulo, e a lista de
 * categorias da associação passa de meia dúzia — em fatias, as menores viram lascas sem
 * rótulo. Horizontal porque nome de categoria é texto longo, que na vertical só caberia
 * girado.
 *
 * Uma cor só por gráfico, e não uma por categoria: a identidade da categoria já está escrita
 * ao lado da barra, e o comprimento já diz o tamanho. Colorir cada uma gastaria o canal de cor
 * repetindo o que a barra mostra.
 */
export const GraficoPorCategoria: React.FC<Props> = ({
  titulo,
  subtitulo,
  dados,
  tipo,
  recarregando = false
}) => {
  const [container, largura] = useLargura<HTMLDivElement>();
  const [destacada, setDestacada] = useState<string | null>(null);
  const [expandido, setExpandido] = useState(false);

  // Total, maior e percentuais sempre sobre a lista inteira: recolher muda o que se vê, não
  // o tamanho relativo das barras nem o total do período.
  const ordenados = [...dados].sort((a, b) => b.total - a.total);
  const visiveis = expandido ? ordenados : ordenados.slice(0, CATEGORIAS_VISIVEIS);
  const total = dados.reduce((soma, d) => soma + d.total, 0);
  const maior = Math.max(0, ...dados.map((d) => d.total));
  const classeDaBarra = tipo === 'RECEITA' ? 'fill-serie-receita' : 'fill-serie-despesa';

  // Espaço reservado à direita para o valor escrito na ponta. Medir antes de desenhar é o que
  // impede o texto de ser cortado pela borda do cartão. Dimensionado para o pior caso de uso
  // real, "R$ 99.999,99 · 100,00%" a 11px (~135px), mais os 8px que afastam o texto da barra —
  // com 104 o percentual já saía cortado em "R$ 2.000,00 · 100%".
  const ESPACO_DO_VALOR = 148;
  const larguraUtil = Math.max(0, largura - LARGURA_DO_ROTULO - ESPACO_DO_VALOR);
  const altura = visiveis.length * ALTURA_DA_LINHA;

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="text-base font-bold text-white font-heading">{titulo}</h3>
        <p className="text-xs text-text-muted">{subtitulo}</p>
      </div>

      {dados.length === 0 ? (
        <p className="text-sm text-text-muted py-6">
          Nenhum lançamento confirmado no período escolhido.
        </p>
      ) : (
        <div
          ref={container}
          className={`transition-opacity ${recarregando ? 'opacity-50' : 'opacity-100'}`}
        >
          {largura > 0 && (
            <svg
              width={largura}
              height={altura}
              role="img"
              aria-label={`${titulo}: ${visiveis
                .map((d) => `${d.categoria}, ${moeda(d.total)}`)
                .join('; ')}`}
            >
              {visiveis.map((d, i) => {
                const y = i * ALTURA_DA_LINHA;
                const comprimento = maior > 0 ? (d.total / maior) * larguraUtil : 0;
                // Duas casas, e "< 0,01%" para o que existe mas é pequeno: arredondar para
                // inteiro mostrava 0% numa categoria que tem dinheiro.
                const percentual = participacao(d.total, total).texto;
                const centro = y + ALTURA_DA_LINHA / 2;

                return (
                  <g
                    key={d.categoriaId}
                    onMouseEnter={() => setDestacada(d.categoriaId)}
                    onMouseLeave={() => setDestacada(null)}
                    onFocus={() => setDestacada(d.categoriaId)}
                    onBlur={() => setDestacada(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${d.categoria}: ${moeda(d.total)}, ${percentual} do total`}
                    className="outline-none"
                  >
                    {destacada === d.categoriaId && (
                      <rect
                        x={0}
                        y={y}
                        width={largura}
                        height={ALTURA_DA_LINHA}
                        rx={6}
                        className="fill-surface-card-hover"
                      />
                    )}

                    <text
                      x={0}
                      y={centro + 4}
                      className="fill-text-secondary"
                      fontSize={12}
                    >
                      {d.categoria.length > 16 ? `${d.categoria.slice(0, 15)}…` : d.categoria}
                    </text>

                    <path
                      d={caminhoDaBarra(
                        LARGURA_DO_ROTULO,
                        centro - ALTURA_DA_BARRA / 2,
                        Math.max(2, comprimento),
                        ALTURA_DA_BARRA
                      )}
                      className={classeDaBarra}
                    />

                    {/* Valor na ponta da barra, do lado de fora: dentro ele caberia só nas
                        barras grandes, e um rótulo que aparece em umas linhas e não em outras
                        confunde mais que ajuda. */}
                    <text
                      x={LARGURA_DO_ROTULO + Math.max(2, comprimento) + 8}
                      y={centro + 4}
                      className="fill-text-secondary"
                      fontSize={11}
                    >
                      {moeda(d.total)}
                      <tspan className="fill-text-muted"> · {percentual}</tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {ordenados.length > CATEGORIAS_VISIVEIS && (
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="text-xs font-semibold text-acpb-yellow hover:underline mt-1"
            >
              {expandido ? 'Recolher' : `Ver todas (${ordenados.length})`}
            </button>
          )}

          <p className="text-xs text-text-muted pt-2 border-t border-surface-border mt-2">
            Total no período: <span className="text-white font-semibold">{moeda(total)}</span>
          </p>
        </div>
      )}
    </div>
  );
};
