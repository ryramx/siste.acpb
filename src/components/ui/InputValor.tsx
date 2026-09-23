import React, { useRef } from 'react';
import { Input } from './Input';
import { numeroParaValor, valorParaNumero } from '../../utils/mascaras';

interface InputValorProps {
  label?: string;
  /** Valor em reais (é o que o serviço envia ao backend), não em centavos.
   *
   * `null` é campo vazio, e não zero: em patrimônio um bem sem valor informado é diferente
   * de um bem que custou R$ 0,00. Quem tem o valor como obrigatório converte com `?? 0` no
   * próprio onChange, deixando essa decisão visível na tela que a toma. */
  value: number | null;
  onChange: (valor: number | null) => void;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
}

/** Campo de dinheiro preenchido da direita para a esquerda, como nos aplicativos de banco.
 *
 * A máscara está em utils/mascaras.ts; aqui mora o que depende do DOM: o cursor e o
 * teclado.
 *
 * O cursor volta ao fim a cada digitação de propósito. A máscara insere pontos e vírgula à
 * esquerda do que se digita, então a posição que o navegador preservaria sozinho já não
 * corresponde ao mesmo lugar do texto -- digitar no meio faria o dígito aparecer em outro
 * ponto. Empurrar o cursor para o fim mantém a regra "o próximo dígito entra nos centavos"
 * verdadeira o tempo todo, que é o que torna esse tipo de campo previsível.
 */
export const InputValor: React.FC<InputValorProps> = ({
  label = 'Valor (R$)',
  value,
  onChange,
  required,
  disabled,
  helperText,
  error
}) => {
  const ref = useRef<HTMLInputElement>(null);

  // O texto vem do número recebido, e não de estado próprio: assim o campo acompanha quem
  // o controla (abrir um formulário de edição, ou o reset após salvar) sem precisar
  // sincronizar duas fontes.
  const texto = numeroParaValor(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitado = e.target.value.replace(/\D/g, '');
    onChange(digitado ? valorParaNumero(e.target.value) : null);
    // Depois do re-render: antes dele o campo ainda tem o texto anterior, e mover o cursor
    // agora não sobreviveria à atualização.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  return (
    <Input
      ref={ref}
      label={label}
      // `inputMode` abre o teclado numérico no celular sem as setas de incremento que o
      // type="number" traz; o type continua texto para a máscara poder existir.
      inputMode="numeric"
      value={texto}
      onChange={handleChange}
      onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
      placeholder="0,00"
      leftIcon={<span className="text-xs font-semibold">R$</span>}
      required={required}
      disabled={disabled}
      helperText={helperText}
      error={error}
    />
  );
};
