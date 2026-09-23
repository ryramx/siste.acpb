import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  calcularRecorte,
  carregarImagem,
  escalaBase,
  limitarDeslocamento,
  limitarZoom,
  recortarParaArquivo
} from '../../utils/imagem';

interface ImageCropModalProps {
  arquivo: File | null;
  onCancelar: () => void;
  onConfirmar: (recortado: File) => void;
  enviando?: boolean;
}

/** Lado da janela de recorte, em pixels de tela. Fixo de propósito: a geometria toda é
 * calculada sobre ele, e deixá-lo responsivo faria o enquadramento mudar quando o teclado
 * do celular abrisse. 256 cabe na menor tela sem espremer os controles. */
const VIEWPORT = 256;

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  arquivo,
  onCancelar,
  onConfirmar,
  enviando = false
}) => {
  const [imagem, setImagem] = useState<(CanvasImageSource & { width: number; height: number }) | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);

  // O arrasto vive em ref, não em estado: ele muda a cada movimento do dedo e re-renderizar
  // o modal inteiro nessa frequência trava a imagem no celular.
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!arquivo) {
      setImagem(null);
      setPreviewUrl(null);
      return;
    }

    let cancelado = false;
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);
    setErro(null);
    setZoom(1);

    carregarImagem(arquivo)
      .then((img) => {
        if (cancelado) return;
        setImagem(img);
        // Começa centralizada: é o enquadramento que a maioria das fotos já quer.
        const escala = escalaBase(img.width, img.height, VIEWPORT);
        setDeslocamento({
          x: (VIEWPORT - img.width * escala) / 2,
          y: (VIEWPORT - img.height * escala) / 2
        });
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir esta imagem.');
      });

    return () => {
      cancelado = true;
      URL.revokeObjectURL(url);
    };
  }, [arquivo]);

  if (!arquivo) return null;

  const escalaAtual = imagem ? escalaBase(imagem.width, imagem.height, VIEWPORT) * limitarZoom(zoom) : 1;
  const larguraExibida = imagem ? imagem.width * escalaAtual : 0;
  const alturaExibida = imagem ? imagem.height * escalaAtual : 0;

  const aplicarDeslocamento = (x: number, y: number) => {
    setDeslocamento({
      x: limitarDeslocamento(x, larguraExibida, VIEWPORT),
      y: limitarDeslocamento(y, alturaExibida, VIEWPORT)
    });
  };

  const iniciarArrasto = (clientX: number, clientY: number) => {
    arrasto.current = { x: clientX - deslocamento.x, y: clientY - deslocamento.y };
  };

  const moverArrasto = (clientX: number, clientY: number) => {
    if (!arrasto.current) return;
    aplicarDeslocamento(clientX - arrasto.current.x, clientY - arrasto.current.y);
  };

  const encerrarArrasto = () => {
    arrasto.current = null;
  };

  const handleZoom = (novoZoom: number) => {
    const limitado = limitarZoom(novoZoom);
    if (!imagem) {
      setZoom(limitado);
      return;
    }
    // Amplia a partir do centro da janela: sem isto, aumentar o zoom empurraria o rosto
    // para fora do enquadramento e o usuário teria que reposicionar a cada ajuste.
    const escalaAnterior = escalaBase(imagem.width, imagem.height, VIEWPORT) * limitarZoom(zoom);
    const escalaNova = escalaBase(imagem.width, imagem.height, VIEWPORT) * limitado;
    const razao = escalaNova / escalaAnterior;
    const centro = VIEWPORT / 2;
    const x = centro - (centro - deslocamento.x) * razao;
    const y = centro - (centro - deslocamento.y) * razao;
    setZoom(limitado);
    setDeslocamento({
      x: limitarDeslocamento(x, imagem.width * escalaNova, VIEWPORT),
      y: limitarDeslocamento(y, imagem.height * escalaNova, VIEWPORT)
    });
  };

  const handleConfirmar = async () => {
    if (!imagem) return;
    setProcessando(true);
    setErro(null);
    try {
      const recorte = calcularRecorte(
        imagem.width,
        imagem.height,
        VIEWPORT,
        zoom,
        deslocamento.x,
        deslocamento.y
      );
      onConfirmar(await recortarParaArquivo(imagem, recorte, arquivo.name));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Não foi possível preparar a imagem.');
    } finally {
      setProcessando(false);
    }
  };

  const ocupado = processando || enviando;

  return (
    <Modal
      isOpen
      onClose={ocupado ? () => {} : onCancelar}
      title="Ajustar foto"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirmar} isLoading={ocupado} disabled={!imagem}>
            Salvar foto
          </Button>
        </>
      }
    >
      <p>Arraste para enquadrar e use o controle abaixo para aproximar.</p>

      {erro && (
        <p role="alert" className="text-red-400">
          {erro}
        </p>
      )}

      <div className="flex justify-center">
        <div
          role="application"
          aria-label="Área de recorte da foto"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          className="relative overflow-hidden rounded-full bg-[#0F1210] border border-[#222824] touch-none cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            iniciarArrasto(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => moverArrasto(e.clientX, e.clientY)}
          onPointerUp={encerrarArrasto}
          onPointerCancel={encerrarArrasto}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: deslocamento.x,
                top: deslocamento.y,
                width: larguraExibida || undefined,
                height: alturaExibida || undefined,
                maxWidth: 'none'
              }}
            />
          )}
          {!imagem && !erro && (
            <div className="absolute inset-0 flex items-center justify-center text-xs">
              Abrindo imagem...
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ZoomIn className="w-4 h-4 shrink-0" />
        <input
          type="range"
          aria-label="Aproximar"
          min={ZOOM_MINIMO}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={zoom}
          disabled={!imagem || ocupado}
          onChange={(e) => handleZoom(Number(e.target.value))}
          className="w-full accent-[#004922]"
        />
      </div>
    </Modal>
  );
};
