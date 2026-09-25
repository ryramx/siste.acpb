import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraficoPorCategoria } from './GraficoPorCategoria';
import { TotalPorCategoria } from '../../services/dashboardFinanceiroService';

const dados: TotalPorCategoria[] = [
  { categoriaId: '2', categoria: 'Aluguel', tipo: 'DESPESA', total: 1200 },
  { categoriaId: '3', categoria: 'Material de escritório', tipo: 'DESPESA', total: 800 },
  { categoriaId: '1', categoria: 'Energia', tipo: 'DESPESA', total: 0 }
];

function renderizar(lista = dados) {
  return render(
    <GraficoPorCategoria
      titulo="Despesas por categoria"
      subtitulo="Para onde foi o dinheiro"
      dados={lista}
      tipo="DESPESA"
    />
  );
}

describe('GraficoPorCategoria', () => {
  it('desenha uma barra por categoria, inclusive a zerada', () => {
    // Categoria com total zero continua na lista: sumir com ela esconderia que ela existe e
    // não foi usada no período, que é uma informação diferente de "não existe".
    const { container } = renderizar();
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });

  it('nao gera coordenada invalida, nem na categoria zerada', () => {
    const { container } = renderizar();
    container.querySelectorAll('path').forEach((p) => {
      expect(p.getAttribute('d')).not.toMatch(/NaN|Infinity|undefined/);
    });
  });

  it('escreve o valor e o percentual na ponta de cada barra', () => {
    renderizar();
    const svg = screen.getByRole('img');
    expect(svg.textContent).toContain('R$ 1.200,00');
    expect(svg.textContent).toContain('60%'); // 1200 de 2000
  });

  it('encurta nome de categoria longo em vez de deixar vazar do cartao', () => {
    renderizar();
    expect(screen.getByRole('img').textContent).toContain('Material de esc');
    expect(screen.getByRole('img').textContent).not.toContain('Material de escritório');
  });

  it('cada barra tem rotulo acessivel com o valor cheio', () => {
    renderizar();
    expect(screen.getByLabelText(/Aluguel: R\$ 1\.200,00, 60% do total/)).toBeInTheDocument();
  });

  it('mostra o total do periodo', () => {
    renderizar();
    expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha lancamento no periodo', () => {
    renderizar([]);
    expect(screen.getByText(/nenhum lançamento confirmado no período/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
