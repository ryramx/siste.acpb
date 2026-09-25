import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraficoEvolucaoMensal } from './GraficoEvolucaoMensal';
import { PontoMensal } from '../../services/dashboardFinanceiroService';

const dados: PontoMensal[] = [
  { ano: 2026, mes: 7, receitas: 5000, despesas: 3200, saldo: 1800, rotulo: 'jul/26' },
  { ano: 2026, mes: 8, receitas: 4200, despesas: 4800, saldo: -600, rotulo: 'ago/26' },
  { ano: 2026, mes: 9, receitas: 0, despesas: 900, saldo: -900, rotulo: 'set/26' }
];

describe('GraficoEvolucaoMensal', () => {
  it('desenha uma barra por valor maior que zero', () => {
    const { container } = render(<GraficoEvolucaoMensal dados={dados} />);
    // 3 meses × 2 séries, menos a receita zerada de setembro, que não vira barra.
    expect(container.querySelectorAll('path')).toHaveLength(5);
  });

  it('nao gera coordenada invalida em nenhuma barra', () => {
    // Um NaN num `d` faz o SVG sumir sem erro no console — falha silenciosa, difícil de achar
    // depois. Aqui ela quebra o teste.
    const { container } = render(<GraficoEvolucaoMensal dados={dados} />);
    container.querySelectorAll('path').forEach((p) => {
      expect(p.getAttribute('d')).not.toMatch(/NaN|Infinity|undefined/);
    });
  });

  it('descreve o periodo para leitor de tela', () => {
    render(<GraficoEvolucaoMensal dados={dados} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /receitas e despesas de jul\/26 a set\/26/i
    );
  });

  it('cada mes tem alvo focavel com os tres numeros no rotulo', () => {
    render(<GraficoEvolucaoMensal dados={dados} />);
    const alvo = screen.getByLabelText(/ago\/26/);
    expect(alvo.getAttribute('aria-label')).toContain('R$ 4.200,00');
    expect(alvo.getAttribute('aria-label')).toContain('R$ 4.800,00');
    expect(alvo.getAttribute('aria-label')).toContain('-R$ 600,00');
  });

  it('a tabela equivalente traz os mesmos valores, sem depender de passar o mouse', async () => {
    const usuario = userEvent.setup();
    render(<GraficoEvolucaoMensal dados={dados} />);

    await usuario.click(screen.getByRole('button', { name: /ver os mesmos dados em tabela/i }));

    const tabela = screen.getByRole('table');
    expect(tabela).toBeInTheDocument();
    expect(tabela.textContent).toContain('R$ 5.000,00');
    expect(tabela.textContent).toContain('-R$ 600,00');
  });

  it('mostra estado vazio em vez de um grafico quebrado', () => {
    render(<GraficoEvolucaoMensal dados={[]} />);
    expect(screen.getByText(/nenhum lançamento confirmado no período/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('a legenda nomeia as duas series, para a identidade nao depender so da cor', () => {
    render(<GraficoEvolucaoMensal dados={dados} />);
    expect(screen.getByText('Receitas')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
  });
});
