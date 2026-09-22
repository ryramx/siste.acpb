import React from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/** Campos de um evento, no formato que as telas manipulam (não o da API). */
export interface EventFormValues {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  maxSlots: number;
  requiresRegistration: boolean;
}

interface EventFormFieldsProps {
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  saving?: boolean;
}

/** Formulário compartilhado entre criar (agenda) e editar (detalhes do evento).
 *
 * Existe como componente próprio para os dois não divergirem: um campo adicionado só no
 * formulário de criação viraria um campo que ninguém consegue corrigir depois. */
export const EventFormFields: React.FC<EventFormFieldsProps> = ({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving = false
}) => {
  const alterar = <K extends keyof EventFormValues>(campo: K, valor: EventFormValues[K]) =>
    onChange({ ...values, [campo]: valor });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <Input
        label="Título do Evento"
        value={values.title}
        onChange={(e) => alterar('title', e.target.value)}
        required
      />
      <Input
        label="Descrição"
        value={values.description}
        onChange={(e) => alterar('description', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Data"
          type="date"
          value={values.date}
          onChange={(e) => alterar('date', e.target.value)}
          required
        />
        <Input
          label="Horário"
          type="time"
          value={values.time}
          onChange={(e) => alterar('time', e.target.value)}
          required
        />
      </div>
      <Input
        label="Local"
        value={values.location}
        onChange={(e) => alterar('location', e.target.value)}
        required
      />
      <Input
        label="Vagas Máximas"
        type="number"
        min={0}
        value={values.maxSlots}
        onChange={(e) => alterar('maxSlots', Number(e.target.value))}
        required
      />
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
