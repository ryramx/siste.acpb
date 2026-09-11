import React, { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../contexts/ToastContext';

interface AvatarUploadProps {
  pessoaId: string;
  nome: string;
  temFoto: boolean;
  onChange: (temFotoAgora: boolean) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const TIPOS_ACEITOS = ['image/png', 'image/jpeg'];
const TAMANHO_MAXIMO_MB = 2;

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  pessoaId,
  nome,
  temFoto,
  onChange,
  size = 'xl'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const { addToast } = useToast();

  const handleSelecionarArquivo = () => inputRef.current?.click();

  const handleArquivoEscolhido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      addToast({ type: 'error', title: 'Formato não aceito', message: 'Envie uma imagem PNG ou JPEG.' });
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'Arquivo muito grande',
        message: `A imagem deve ter no máximo ${TAMANHO_MAXIMO_MB}MB.`
      });
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      await apiClient.postForm(`/pessoas/${pessoaId}/foto`, formData);
      onChange(true);
      addToast({ type: 'success', title: 'Foto atualizada' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao enviar foto', message });
    } finally {
      setEnviando(false);
    }
  };

  const handleRemover = async () => {
    setEnviando(true);
    try {
      await apiClient.delete(`/pessoas/${pessoaId}/foto`);
      onChange(false);
      addToast({ type: 'success', title: 'Foto removida' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao remover foto', message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <Avatar pessoaId={pessoaId} nome={nome} temFoto={temFoto} size={size} />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleArquivoEscolhido}
      />
      <div className="absolute -bottom-1 -right-1 flex gap-1">
        <button
          type="button"
          onClick={handleSelecionarArquivo}
          disabled={enviando}
          aria-label="Enviar foto"
          title="Enviar foto"
          className="p-1.5 rounded-full bg-[#004922] text-white hover:bg-[#00632e] transition-colors disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        {temFoto && (
          <button
            type="button"
            onClick={handleRemover}
            disabled={enviando}
            aria-label="Remover foto"
            title="Remover foto"
            className="p-1.5 rounded-full bg-red-900 text-white hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
