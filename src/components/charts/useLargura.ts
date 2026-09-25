import { useEffect, useRef, useState } from 'react';

/** Mede a largura real do elemento e reage quando ela muda.
 *
 * Existe porque a alternativa comum — desenhar o SVG num tamanho fixo e deixar o navegador
 * escalar com `viewBox` — encolhe o texto junto. Num gráfico de 720px de largura aberto num
 * celular de 360px, todo rótulo cairia pela metade e ficaria ilegível justamente em quem mais
 * usa o sistema no celular.
 *
 * Medindo, o SVG é desenhado no tamanho real e o texto fica em pixels de verdade em qualquer
 * tela.
 */
export function useLargura<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
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
  }, []);

  return [ref, largura];
}
