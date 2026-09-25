import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaBreakdown } from './FinancialDashboard';
import { FinancialTransaction } from '../../types/domain';

function lancamento(id: number, category: string, amount: number): FinancialTransaction {
  return {
    id: String(id),
    type: 'RECEITA',
    status: 'CONFIRMADA',
    category,
    amount,
    date: '2026-09-25',
    description: 'teste'
  } as FinancialTransaction;
}

function renderizar(transacoes: FinancialTransaction[]) {
  return render(
    <CategoriaBreakdown
      titulo="Receitas por Categoria"
      icon={null}
      transactions={transacoes}
      type="RECEITA"
      barColor="bg-green-500"
      textColor="text-green-400"
    />
  );
}

describe('CategoriaBreakdown', () => {
  it('mostra a categoria pequena como "< 0,01%", e não 0%', () => {
    renderizar([lancamento(1, 'Convênios', 10_000_000_000), lancamento(2, 'Doações', 0.02)]);
    expect(screen.getByText(/< 0,01%/)).toBeInTheDocument();
    expect(screen.queryByText(/\(0%\)/)).not.toBeInTheDocument();
  });

  it('mostra as 5 maiores e recolhe o resto', async () => {
    const transacoes = Array.from({ length: 7 }, (_, i) => lancamento(i, `Categoria ${i}`, i + 1));
    renderizar(transacoes);

    // A maior aparece; as duas menores ficam escondidas.
    expect(screen.getByText('Categoria 6')).toBeInTheDocument();
    expect(screen.queryByText('Categoria 0')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todas (7)' }));
    expect(screen.getByText('Categoria 0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Recolher' }));
    expect(screen.queryByText('Categoria 0')).not.toBeInTheDocument();
  });

  it('sem botão quando cabem todas', () => {
    renderizar([lancamento(1, 'Doações', 10)]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
