import { apiClient } from './apiClient';
import { isoLocal } from '../utils/data';

/** Agregações financeiras calculadas pelo backend.
 *
 * Os endpoints existem desde a tarefa 22 e nenhuma tela os consumia: o dashboard somava os
 * lançamentos no navegador, o que só funciona enquanto a lista inteira couber na memória da
 * aba. Agregar no banco também é o que faz o filtro de período valer para todos os números da
 * tela ao mesmo tempo.
 */

export interface PontoMensal {
  ano: number;
  mes: number;
  receitas: number;
  despesas: number;
  /** Derivado aqui: o backend devolve só os dois lados. */
  saldo: number;
  /** "jan/26" — rótulo pronto para o eixo. */
  rotulo: string;
}

export interface TotalPorCategoria {
  categoriaId: string;
  categoria: string;
  tipo: 'RECEITA' | 'DESPESA';
  total: number;
}

export interface PeriodoDoFiltro {
  dataInicio?: string;
  dataFim?: string;
}

interface ApiEvolucao {
  ano: number;
  mes: number;
  receitas: number;
  despesas: number;
}

interface ApiCategoria {
  categoria_id: number;
  categoria_nome: string;
  tipo: string;
  total: number;
}

/** Completa com zero os meses sem lançamento confirmado.
 *
 * O backend só devolve meses que têm movimento. Sem preencher, "últimos 12 meses" com
 * lançamentos só em setembro vira uma coluna solitária no meio do gráfico, e meses vizinhos
 * no eixo podem estar a um ano de distância um do outro sem nada que avise. O intervalo vai
 * do início ao fim do filtro; sem filtro ("Tudo"), do primeiro ao último mês com movimento.
 * Sem nenhum ponto, devolve vazio — o gráfico mostra o estado vazio em vez de doze zeros.
 */
export function preencherMeses(pontos: ApiEvolucao[], periodo: PeriodoDoFiltro = {}): ApiEvolucao[] {
  if (pontos.length === 0) return [];

  const indice = (ano: number, mes: number) => ano * 12 + (mes - 1);
  const doIso = (iso: string) => indice(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)));
  const ordenados = [...pontos].sort((a, b) => indice(a.ano, a.mes) - indice(b.ano, b.mes));

  const primeiro = periodo.dataInicio
    ? doIso(periodo.dataInicio)
    : indice(ordenados[0].ano, ordenados[0].mes);
  const ultimo = periodo.dataFim
    ? doIso(periodo.dataFim)
    : indice(ordenados[ordenados.length - 1].ano, ordenados[ordenados.length - 1].mes);

  const porMes = new Map(ordenados.map((p) => [indice(p.ano, p.mes), p]));
  const resultado: ApiEvolucao[] = [];
  for (let i = primeiro; i <= ultimo; i++) {
    const ano = Math.floor(i / 12);
    const mes = (i % 12) + 1;
    resultado.push(porMes.get(i) ?? { ano, mes, receitas: 0, despesas: 0 });
  }
  return resultado;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Monta a query descartando filtro vazio — mandar `?data_inicio=` faria o backend filtrar por
 * string vazia em vez de não filtrar. */
export function buildQueryDePeriodo(periodo: PeriodoDoFiltro = {}): string {
  const params = new URLSearchParams();
  if (periodo.dataInicio) params.set('data_inicio', periodo.dataInicio);
  if (periodo.dataFim) params.set('data_fim', periodo.dataFim);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Presets de período. O intervalo é fechado nos dois lados porque o backend compara com a
 * data do lançamento, que é um `date` — sem hora, então não há o problema de "último dia
 * cortado à meia-noite" que a tela de auditoria tem. */
export type ChaveDePeriodo = 'TUDO' | 'ANO' | 'DOZE_MESES' | 'SEIS_MESES';

export function periodoDe(chave: ChaveDePeriodo, hoje = new Date()): PeriodoDoFiltro {
  // Data local, não `toISOString()`: ver utils/data.ts.
  const iso = isoLocal;
  const fim = iso(hoje);

  switch (chave) {
    case 'TUDO':
      return {};
    case 'ANO':
      return { dataInicio: `${hoje.getFullYear()}-01-01`, dataFim: fim };
    case 'DOZE_MESES': {
      const inicio = new Date(hoje);
      inicio.setMonth(inicio.getMonth() - 11);
      inicio.setDate(1);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
    case 'SEIS_MESES': {
      const inicio = new Date(hoje);
      inicio.setMonth(inicio.getMonth() - 5);
      inicio.setDate(1);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
  }
}

export const dashboardFinanceiroService = {
  async evolucaoMensal(periodo: PeriodoDoFiltro = {}): Promise<PontoMensal[]> {
    const pontos = await apiClient.get<ApiEvolucao[]>(
      `/dashboard/financeiro/evolucao${buildQueryDePeriodo(periodo)}`
    );
    return preencherMeses(pontos, periodo).map((p) => ({
      ano: p.ano,
      mes: p.mes,
      receitas: p.receitas,
      despesas: p.despesas,
      saldo: p.receitas - p.despesas,
      // Ano com dois dígitos: o eixo de 12 meses não comporta "janeiro de 2026" e a virada de
      // ano precisa ficar visível.
      rotulo: `${MESES[p.mes - 1]}/${String(p.ano).slice(-2)}`
    }));
  },

  /** `tipo` filtra no backend; sem ele viriam receitas e despesas misturadas na mesma lista. */
  async porCategoria(
    tipo: 'RECEITA' | 'DESPESA',
    periodo: PeriodoDoFiltro = {}
  ): Promise<TotalPorCategoria[]> {
    // O banco grava ENTRADA/SAIDA; RECEITA/DESPESA é só como a interface os chama.
    const tipoBackend = tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA';
    const query = buildQueryDePeriodo(periodo);
    const separador = query ? '&' : '?';
    const linhas = await apiClient.get<ApiCategoria[]>(
      `/dashboard/financeiro/por-categoria${query}${separador}tipo=${tipoBackend}`
    );

    return linhas
      .map((l) => ({
        categoriaId: String(l.categoria_id),
        categoria: l.categoria_nome,
        tipo: l.tipo.toUpperCase() === 'ENTRADA' ? ('RECEITA' as const) : ('DESPESA' as const),
        total: Number(l.total)
      }))
      // Maior primeiro: a ordem é o que torna a barra comparável de relance.
      .sort((a, b) => b.total - a.total);
  }
};
