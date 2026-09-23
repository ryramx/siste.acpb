import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { assinarEsperaLonga } from '../../services/apiClient';

/** Linha discreta que aparece quando alguma chamada demora mais que o normal.
 *
 * O caso real: a API roda no plano gratuito do Render, que desliga o serviço quando ele fica
 * ocioso. O primeiro acesso do dia espera o servidor subir, o que passa de meio minuto. Sem
 * nenhum sinal, a tela parada parece travada — mas não há erro nenhum, e insistir ou recarregar
 * só reinicia a espera.
 *
 * Fica fora do fluxo da página, sem bloquear nada: não é um erro, é uma explicação. Some
 * sozinha assim que a resposta chega.
 */
export const AvisoServidorIniciando: React.FC = () => {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => assinarEsperaLonga(setVisivel), []);

  if (!visivel) return null;

  return (
    <div
      // pointer-events-none: o aviso nunca deve atrapalhar um toque na tela por baixo dele.
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 w-full max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#181D1A] border border-[#222824] rounded-lg shadow-lg">
        <Loader2 className="w-4 h-4 text-[#F8D800] animate-spin shrink-0" />
        <span className="text-xs text-[#AEB5B0]">
          O servidor está iniciando. Isso pode levar até um minuto.
        </span>
      </div>
    </div>
  );
};
