import { useCallback, useEffect, useState } from 'react';

/** Mede a largura real do elemento e reage quando ela muda.
 *
 * Existe porque a alternativa comum — desenhar o SVG num tamanho fixo e deixar o navegador
 * escalar com `viewBox` — encolhe o texto junto. Num gráfico de 720px de largura aberto num
 * celular de 360px, todo rótulo cairia pela metade e ficaria ilegível justamente em quem mais
 * usa o sistema no celular.
 *
 * Medindo, o SVG é desenhado no tamanho real e o texto fica em pixels de verdade em qualquer
 * tela.
 *
 * Devolve uma *callback ref*, não um `useRef`: o elemento medido só é renderizado depois que
 * os dados chegam, e um efeito preso ao `ref.current` da montagem rodaria com `null` e nunca
 * mais — o gráfico ficava com largura 0 e não era desenhado. Guardando o elemento em estado,
 * a medição começa quando ele aparece e recomeça se ele for trocado.
 */
export function useLargura<T extends HTMLElement>(): [(elemento: T | null) => void, number] {
  const [elemento, setElemento] = useState<T | null>(null);
  const [largura, setLargura] = useState(0);
  const ref = useCallback((novo: T | null) => setElemento(novo), []);

  useEffect(() => {
    if (!elemento) return;

    // `ResizeObserver` não existe no jsdom dos testes; sem o fallback, montar um gráfico
    // quebraria a suíte inteira em vez de apenas não observar redimensionamento.
    if (typeof ResizeObserver === 'undefined') {
      setLargura(elemento.getBoundingClientRect().width || 640);
      return;
    }

    const observador = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect.width ?? 0;
      setLargura(Math.round(medida));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [elemento]);

  return [ref, largura];
}
