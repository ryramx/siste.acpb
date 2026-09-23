/** Recorte e redimensionamento de foto no navegador, antes do envio.
 *
 * A foto de um celular atual tem entre 3 e 8MB, e o avatar aparece na tela com algumas
 * dezenas de pixels. Enviar o arquivo original gastaria banda do usuário (no 4G, em pé na
 * associação) e espaço no object storage para exibir uma miniatura. Por isso o recorte
 * acontece aqui e o que sobe é sempre um JPEG de 512x512 -- poucas dezenas de KB. O limite
 * de tamanho do servidor continua valendo como rede de segurança, mas deixa de ser
 * alcançado por foto de câmera.
 *
 * O modelo geométrico é o mesmo de qualquer editor de recorte: uma janela quadrada fixa
 * (o "viewport") sobre a imagem, que o usuário arrasta e amplia. A imagem começa na menor
 * escala que ainda cobre a janela inteira, e o deslocamento é limitado para que nunca
 * apareça uma faixa vazia na borda -- daí `limitarDeslocamento`, chamada a cada arrasto.
 *
 * As funções de geometria são puras de propósito: é onde moram os erros de sinal e de
 * borda, e assim elas podem ser testadas sem canvas nem navegador.
 */

export const TAMANHO_SAIDA_PX = 512;
export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 4;

/** Recorte em coordenadas da imagem original, pronto para `drawImage`. */
export interface Recorte {
  sx: number;
  sy: number;
  tamanho: number;
}

/** Menor escala que ainda cobre a janela inteira, sem deixar borda vazia. */
export function escalaBase(largura: number, altura: number, viewport: number): number {
  return viewport / Math.min(largura, altura);
}

export function limitarZoom(zoom: number): number {
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
}

/** Mantém a janela dentro da imagem.
 *
 * O deslocamento é a posição do canto da imagem em relação ao canto da janela, então anda
 * de `viewport - dimensaoExibida` (negativo, imagem puxada para a esquerda/cima) até 0. Se
 * a imagem for menor que a janela -- o que só acontece por arredondamento, já que a escala
 * base cobre --, centralizar é o único enquadramento possível.
 */
export function limitarDeslocamento(
  valor: number,
  dimensaoExibida: number,
  viewport: number
): number {
  const minimo = viewport - dimensaoExibida;
  if (minimo >= 0) return minimo / 2;
  return Math.min(0, Math.max(minimo, valor));
}

/** Converte a posição na tela para o retângulo correspondente na imagem original. */
export function calcularRecorte(
  largura: number,
  altura: number,
  viewport: number,
  zoom: number,
  deslocamentoX: number,
  deslocamentoY: number
): Recorte {
  const escala = escalaBase(largura, altura, viewport) * limitarZoom(zoom);
  const x = limitarDeslocamento(deslocamentoX, largura * escala, viewport);
  const y = limitarDeslocamento(deslocamentoY, altura * escala, viewport);
  return {
    sx: -x / escala,
    sy: -y / escala,
    tamanho: viewport / escala
  };
}

/** Decodifica o arquivo respeitando a orientação EXIF.
 *
 * Foto tirada com o celular deitado guarda a rotação em metadado, não nos pixels. Sem
 * `imageOrientation`, `createImageBitmap` ignora esse metadado e a pessoa aparece de lado
 * no recorte -- só no recorte, porque a tag e a exibição normal do navegador concordam.
 * O caminho por `<img>` existe para navegadores sem `createImageBitmap`, e lá a correção
 * é o comportamento padrão.
 */
export async function carregarImagem(arquivo: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch {
      // Cai no caminho abaixo: navegador sem suporte à opção, ou arquivo que ele recusa.
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Desenha o recorte em 512x512 e devolve um JPEG.
 *
 * O fundo branco é pintado antes: um PNG com transparência viraria preto no JPEG, que não
 * tem canal alfa, e o avatar sairia com fundo escuro sem explicação.
 */
export async function recortarParaArquivo(
  fonte: CanvasImageSource,
  recorte: Recorte,
  nomeArquivo: string
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = TAMANHO_SAIDA_PX;
  canvas.height = TAMANHO_SAIDA_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a imagem neste navegador.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, TAMANHO_SAIDA_PX, TAMANHO_SAIDA_PX);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    fonte,
    recorte.sx,
    recorte.sy,
    recorte.tamanho,
    recorte.tamanho,
    0,
    0,
    TAMANHO_SAIDA_PX,
    TAMANHO_SAIDA_PX
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );
  if (!blob) throw new Error('Não foi possível preparar a imagem neste navegador.');

  return new File([blob], trocarParaJpg(nomeArquivo), { type: 'image/jpeg' });
}

/** O conteúdo enviado é sempre JPEG; manter ".png" no nome confundiria quem baixasse. */
export function trocarParaJpg(nomeArquivo: string): string {
  const base = nomeArquivo.replace(/\.[^.]+$/, '') || 'foto';
  return `${base}.jpg`;
}
