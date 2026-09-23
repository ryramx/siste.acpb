import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  OPCOES_BASE,
  alternarOpcao,
  estaSelecionada,
  montarOpcoes
} from '../../utils/disponibilidade';

interface SeletorDisponibilidadeProps {
  /** Opções marcadas, na ordem em que entraram. */
  selecionadas: string[];
  onChange: (selecionadas: string[]) => void;
  /** Disponibilidades já usadas por outros voluntários, que viram opções aqui. */
  opcoesConhecidas?: string[];
  disabled?: boolean;
}

/** Caixas de seleção de disponibilidade, com campo para criar uma opção nova.
 *
 * A opção criada aqui vale imediatamente para este voluntário e, por ficar gravada no
 * cadastro dele, aparece como caixa para todos os outros na próxima abertura -- é assim
 * que a lista cresce, sem tabela de configuração. Ver utils/disponibilidade.ts.
 */
export const SeletorDisponibilidade: React.FC<SeletorDisponibilidadeProps> = ({
  selecionadas,
  onChange,
  opcoesConhecidas = [],
  disabled = false
}) => {
  const [nova, setNova] = useState('');

  // As marcadas entram na montagem para que uma opção que so existe neste voluntário
  // (criada antes, ou vinda de texto livre antigo) continue visível e marcada.
  const opcoes = montarOpcoes(OPCOES_BASE, opcoesConhecidas, selecionadas);

  const adicionar = () => {
    const valor = nova.trim();
    if (!valor) return;
    // alternarOpcao ignora caixa e acentos, entao digitar algo que ja existe apenas marca a
    // opcao existente em vez de criar uma quase-igual.
    if (!estaSelecionada(valor, selecionadas)) onChange(alternarOpcao(valor, selecionadas));
    setNova('');
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#AEB5B0]">Disponibilidade</span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {opcoes.map((opcao) => {
          const marcada = estaSelecionada(opcao, selecionadas);
          return (
            <label
              key={opcao}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                marcada
                  ? 'bg-[#004922]/20 border-[#004922] text-white'
                  : 'bg-[#151917] border-[#222824] text-[#AEB5B0] hover:border-[#004922]/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={marcada}
                disabled={disabled}
                onChange={() => onChange(alternarOpcao(opcao, selecionadas))}
                className="accent-[#004922] shrink-0"
              />
              <span>{opcao}</span>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2 mt-1">
        <input
          type="text"
          value={nova}
          disabled={disabled}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            // O seletor vive dentro de um <form>; sem isto o Enter enviaria o formulário
            // inteiro em vez de acrescentar a opção que a pessoa acabou de digitar.
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Outra disponibilidade..."
          aria-label="Criar outra opção de disponibilidade"
          className="flex-1 bg-[#151917] border border-[#222824] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#004922] focus:ring-1 focus:ring-[#004922] transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={disabled || !nova.trim()}
          aria-label="Adicionar opção"
          className="px-3 rounded-lg bg-[#222824] text-white hover:bg-[#2c332e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <span className="text-xs text-[#727A74]">
        Marque quantas quiser. Uma opção criada aqui fica disponível para os outros
        voluntários.
      </span>
    </div>
  );
};
