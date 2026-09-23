import React, { useEffect, useId } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md'
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div
      // overflow-y-auto no fundo: um modal alto ficava centralizado com o topo fora da tela,
      // e o cabeçalho (com o botão de fechar) era cortado — pior no celular, onde sobra
      // menos altura. Com o fundo rolável, o topo sempre é alcançável.
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-[#181D1A] border border-[#222824] rounded-xl w-full ${widthClasses[maxWidth]} shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222824]">
          <h3 id={titleId} className="text-lg font-semibold text-white font-heading">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-[#AEB5B0] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#222824]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-[#AEB5B0]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#222824] bg-[#0F1210]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
