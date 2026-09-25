import React, { SelectHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    // Mesmo problema que o Input tinha: sem `id` nem `name`, o htmlFor saía vazio e o rótulo
    // não apontava para campo nenhum — leitor de tela não o anunciava e clicar no texto não
    // focava o select.
    const idGerado = useId();
    const selectId = id || props.name || idGerado;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-text-secondary">
            {label} {props.required && <span className="text-acpb-yellow">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full bg-surface-input border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-acpb-green focus:ring-1 focus:ring-acpb-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-600 focus:border-red-600 focus:ring-red-600',
              className
            )
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-card text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
