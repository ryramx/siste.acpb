import { apiClient } from './apiClient';
import { Asset, AssetFilters, AssetInput, AssetStatus } from '../types/patrimonio';

interface ApiPatrimonio {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  data_aquisicao: string | null;
  valor_aquisicao: string | number | null;
  local: string | null;
  responsavel_id: number | null;
  status: string;
  observacoes: string | null;
}

interface ApiPessoaResumo {
  id: number;
  nome_completo: string;
}

/** Monta a query da listagem, descartando filtros vazios. Exportada para teste. */
export function buildAssetPath(filtros: AssetFilters = {}): string {
  const params = new URLSearchParams();
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  // O backend nomeia o parâmetro status_filtro para não colidir com o módulo `status` do FastAPI.
  if (filtros.status) params.set('status_filtro', filtros.status);
  if (filtros.responsavelId) params.set('responsavel_id', filtros.responsavelId);
  const query = params.toString();
  return query ? `/patrimonios/?${query}` : '/patrimonios/';
}

function toAsset(api: ApiPatrimonio, nomesPorPessoaId: Map<number, string>): Asset {
  return {
    id: String(api.id),
    codigo: api.codigo,
    nome: api.nome,
    categoria: api.categoria,
    dataAquisicao: api.data_aquisicao,
    // Numeric do Postgres chega como string para não perder precisão; a UI trabalha com número.
    valorAquisicao: api.valor_aquisicao === null ? null : Number(api.valor_aquisicao),
    local: api.local,
    responsavelId: api.responsavel_id === null ? null : String(api.responsavel_id),
    responsavelNome:
      api.responsavel_id === null ? null : nomesPorPessoaId.get(api.responsavel_id) ?? null,
    status: api.status as AssetStatus,
    observacoes: api.observacoes
  };
}

function toPayload(entrada: AssetInput): Record<string, unknown> {
  return {
    codigo: entrada.codigo,
    nome: entrada.nome,
    categoria: entrada.categoria,
    data_aquisicao: entrada.dataAquisicao || null,
    valor_aquisicao: entrada.valorAquisicao ?? null,
    local: entrada.local || null,
    responsavel_id: entrada.responsavelId ? Number(entrada.responsavelId) : null,
    status: entrada.status,
    observacoes: entrada.observacoes || null
  };
}

async function carregarNomesDePessoas(): Promise<Map<number, string>> {
  // Falhar aqui não deve esconder o patrimônio: sem os nomes a lista ainda é útil.
  try {
    const pessoas = await apiClient.get<ApiPessoaResumo[]>('/pessoas/');
    return new Map(pessoas.map((p) => [p.id, p.nome_completo]));
  } catch {
    return new Map();
  }
}

export const patrimonioService = {
  async getAll(filtros: AssetFilters = {}): Promise<Asset[]> {
    const [registros, nomes] = await Promise.all([
      apiClient.get<ApiPatrimonio[]>(buildAssetPath(filtros)),
      carregarNomesDePessoas()
    ]);
    return registros.map((r) => toAsset(r, nomes));
  },

  async create(entrada: AssetInput): Promise<Asset> {
    const criado = await apiClient.post<ApiPatrimonio>('/patrimonios/', toPayload(entrada));
    return toAsset(criado, await carregarNomesDePessoas());
  },

  async update(id: string, entrada: AssetInput): Promise<Asset> {
    const atualizado = await apiClient.put<ApiPatrimonio>(`/patrimonios/${id}`, toPayload(entrada));
    return toAsset(atualizado, await carregarNomesDePessoas());
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/patrimonios/${id}`);
  },

  /** Opções de responsável para o formulário — reaproveita o cadastro real de Pessoas.
   * Contas técnicas ficam de fora: não respondem por um bem da associação. */
  async listarPessoas(): Promise<{ id: string; nome: string }[]> {
    const pessoas = await apiClient.get<ApiPessoaResumo[]>('/pessoas/?excluir_tecnicas=true');
    return pessoas.map((p) => ({ id: String(p.id), nome: p.nome_completo }));
  }
};
