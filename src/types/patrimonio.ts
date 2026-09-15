/** Status de um bem. Lista fechada, espelhando STATUS_VALIDOS em
 * backend/app/schemas/patrimonio.py — o backend rejeita qualquer outro valor com 422. */
export type AssetStatus = 'ATIVO' | 'EM_MANUTENCAO' | 'BAIXADO' | 'EMPRESTADO';

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  BAIXADO: 'Baixado',
  EMPRESTADO: 'Emprestado'
};

/** Bem patrimonial (tabela `patrimonios`). */
export interface Asset {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  dataAquisicao: string | null;
  valorAquisicao: number | null;
  local: string | null;
  responsavelId: string | null;
  /** Nome da pessoa responsável, resolvido a partir do cadastro de Pessoas. */
  responsavelNome: string | null;
  status: AssetStatus;
  observacoes: string | null;
}

/** Campos aceitos na criação/edição — o id e os timestamps são do backend. */
export interface AssetInput {
  codigo: string;
  nome: string;
  categoria: string;
  dataAquisicao?: string | null;
  valorAquisicao?: number | null;
  local?: string | null;
  responsavelId?: string | null;
  status: AssetStatus;
  observacoes?: string | null;
}

export interface AssetFilters {
  categoria?: string;
  status?: AssetStatus | '';
  responsavelId?: string;
}
