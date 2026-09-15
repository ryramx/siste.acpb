import { apiClient } from './apiClient';
import { userManagementService } from './settingsService';

/** Registro de auditoria já normalizado para a UI (tabela `auditoria`). */
export interface AuditEntry {
  id: string;
  usuarioId: string | null;
  /** Nome da pessoa por trás do usuário que executou a ação; cai para um rótulo
   * genérico quando o usuário não pôde ser resolvido (ex.: ator nulo). */
  usuarioNome: string;
  acao: string;
  tabela: string | null;
  registroId: number | null;
  descricao: string | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditFilters {
  usuarioId?: string;
  tabela?: string;
  acao?: string;
  /** Data (YYYY-MM-DD) — convertida para o início do dia. */
  dataInicio?: string;
  /** Data (YYYY-MM-DD) — convertida para o fim do dia, ver buildAuditPath. */
  dataFim?: string;
  limit?: number;
  offset?: number;
}

interface ApiAuditoria {
  id: number;
  usuario_id: number | null;
  acao: string;
  tabela: string | null;
  registro_id: number | null;
  descricao: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

/**
 * Monta a query da listagem. Exportada para teste.
 *
 * `data_fim` recebe T23:59:59 porque o backend compara com `created_at`, que é
 * datetime: mandar só a data significaria meia-noite e excluiria todo o último
 * dia escolhido pelo usuário.
 */
export function buildAuditPath(filtros: AuditFilters = {}): string {
  const params = new URLSearchParams();
  if (filtros.usuarioId) params.set('usuario_id', filtros.usuarioId);
  if (filtros.tabela) params.set('tabela', filtros.tabela);
  if (filtros.acao) params.set('acao', filtros.acao);
  if (filtros.dataInicio) params.set('data_inicio', `${filtros.dataInicio}T00:00:00`);
  if (filtros.dataFim) params.set('data_fim', `${filtros.dataFim}T23:59:59`);
  params.set('limit', String(filtros.limit ?? 50));
  params.set('offset', String(filtros.offset ?? 0));
  return `/auditoria/?${params.toString()}`;
}

function toAuditEntry(registro: ApiAuditoria, nomesPorUsuarioId: Map<number, string>): AuditEntry {
  return {
    id: String(registro.id),
    usuarioId: registro.usuario_id === null ? null : String(registro.usuario_id),
    usuarioNome:
      registro.usuario_id === null
        ? 'Sistema'
        : nomesPorUsuarioId.get(registro.usuario_id) ?? `Usuário #${registro.usuario_id}`,
    acao: registro.acao,
    tabela: registro.tabela,
    registroId: registro.registro_id,
    descricao: registro.descricao,
    dadosAnteriores: registro.dados_anteriores,
    dadosNovos: registro.dados_novos,
    ip: registro.ip,
    createdAt: registro.created_at
  };
}

export const auditService = {
  /** Lista registros de auditoria já com o nome do ator resolvido.
   * Exige `auditoria.visualizar` no backend (na prática, só Administrador). */
  async list(filtros: AuditFilters = {}): Promise<AuditEntry[]> {
    const [registros, usuarios] = await Promise.all([
      apiClient.get<ApiAuditoria[]>(buildAuditPath(filtros)),
      // A auditoria guarda só o usuario_id; o nome vem do cadastro de usuários.
      // Falhar aqui não deve esconder a auditoria — sem os nomes a tela ainda
      // é útil, então caímos para os ids.
      userManagementService.getAll().catch(() => [])
    ]);

    const nomesPorUsuarioId = new Map<number, string>(
      usuarios.map((u) => [Number(u.id), u.name])
    );
    return registros.map((r) => toAuditEntry(r, nomesPorUsuarioId));
  },

  /** Opções de ator para o filtro, reaproveitando o cadastro real de usuários. */
  async listarUsuarios(): Promise<{ id: string; nome: string }[]> {
    const usuarios = await userManagementService.getAll();
    return usuarios.map((u) => ({ id: u.id, nome: u.name }));
  }
};
