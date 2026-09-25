import React, { InputHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className, id, ...props }, ref) => {
    // Sem isto, um Input sem `id` nem `name` renderizava `htmlFor` vazio: o rótulo ficava
    // solto, sem apontar para campo nenhum. Leitor de tela não anuncia o rótulo ao focar o
    // campo, e clicar no texto não foca o input. Acontecia em 28 dos 52 campos rotulados do
    // sistema, porque passar `name` é opcional e fácil de esquecer.
    const idGerado = useId();
    const inputId = id || props.name || idGerado;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label} {props.required && <span className="text-acpb-yellow">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-text-secondary pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-surface-input border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-acpb-green focus:ring-1 focus:ring-acpb-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                leftIcon && 'pl-9',
                rightIcon && 'pr-9',
                error && 'border-red-600 focus:border-red-600 focus:ring-red-600',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-text-secondary flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : (
          helperText && <span className="text-xs text-text-muted">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
