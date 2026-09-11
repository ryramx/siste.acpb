import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

interface AvatarProps {
  /** id da Pessoa (não do Membro/Voluntário/Usuário) — a foto é sempre por Pessoa. */
  pessoaId: string;
  nome: string;
  temFoto: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const TAMANHOS: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl'
};

// Paleta neutra, determinística por nome — só para dar alguma variação visual às iniciais
// sem depender de foto real (que é opcional, ver tarefa de "foto de perfil").
const CORES_FUNDO = ['#004922', '#1c3d5a', '#5a3d1c', '#3d1c5a', '#1c5a4a'];

function corDeFundo(nome: string): string {
  const soma = nome.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CORES_FUNDO[soma % CORES_FUNDO.length];
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ pessoaId, nome, temFoto, size = 'md', className = '' }) => {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!temFoto) {
      setFotoUrl(null);
      return;
    }
    let urlAtual: string | null = null;
    let cancelado = false;

    apiClient
      .getBlob(`/pessoas/${pessoaId}/foto`)
      .then((blob) => {
        if (cancelado) return;
        urlAtual = URL.createObjectURL(blob);
        setFotoUrl(urlAtual);
      })
      .catch(() => {
        if (!cancelado) setFotoUrl(null);
      });

    return () => {
      cancelado = true;
      if (urlAtual) URL.revokeObjectURL(urlAtual);
    };
  }, [pessoaId, temFoto]);

  const classesTamanho = TAMANHOS[size];

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        className={`${classesTamanho} rounded-full object-cover border border-[#004922]/50 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={nome}
      style={{ backgroundColor: corDeFundo(nome) }}
      className={`${classesTamanho} rounded-full flex items-center justify-center font-bold text-white border border-[#004922]/50 shrink-0 ${className}`}
    >
      {iniciais(nome) || '?'}
    </div>
  );
};
