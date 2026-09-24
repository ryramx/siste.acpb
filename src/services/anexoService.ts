import { apiClient } from './apiClient';
import { salvarArquivo } from '../utils/download';

/** Comprovante de um lançamento financeiro, como a tela precisa dele. */
export interface AnexoFinanceiro {
  id: string;
  movimentacaoId: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  /** Data/hora do envio (ISO, como vem do backend). */
  enviadoEm: string;
  enviadoPorUsuarioId: string;
}

interface ApiAnexo {
  id: number;
  movimentacao_financeira_id: number;
  nome_original: string;
  tipo_mime: string;
  tamanho_bytes: number;
  enviado_por_usuario_id: number;
  created_at: string;
}

/** Espelha `TIPOS_PERMITIDOS` de backend/app/core/anexos_storage.py.
 *
 * Duplicar a lista aqui serve para recusar o arquivo antes de subir 5MB por uma rede de
 * celular para ouvir um 400 no fim. O backend continua sendo a validação que vale — esta é
 * só a cortesia. */
export const TIPOS_ACEITOS = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** Espelha `ANEXOS_TAMANHO_MAXIMO_MB` (config.py). Mesma razão da lista de tipos. */
export const TAMANHO_MAXIMO_MB = 5;

function mapear(a: ApiAnexo): AnexoFinanceiro {
  return {
    id: String(a.id),
    movimentacaoId: String(a.movimentacao_financeira_id),
    nomeOriginal: a.nome_original,
    tipoMime: a.tipo_mime,
    tamanhoBytes: a.tamanho_bytes,
    enviadoEm: a.created_at,
    enviadoPorUsuarioId: String(a.enviado_por_usuario_id)
  };
}

/** Recusa o arquivo escolhido antes de qualquer requisição. Devolve a mensagem do problema,
 * ou `null` quando está tudo certo. */
export function validarArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type as (typeof TIPOS_ACEITOS)[number])) {
    return 'Envie um PDF, PNG ou JPEG — são os formatos aceitos para comprovante.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    return `O arquivo deve ter no máximo ${TAMANHO_MAXIMO_MB}MB.`;
  }
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.';
  }
  return null;
}

/** Tamanho legível para a lista. KB e MB bastam: o teto é 5MB. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const anexoService = {
  async listar(movimentacaoId: string): Promise<AnexoFinanceiro[]> {
    const anexos = await apiClient.get<ApiAnexo[]>(
      `/anexos-financeiros/?movimentacao_financeira_id=${encodeURIComponent(movimentacaoId)}`
    );
    return anexos.map(mapear);
  },

  /** O endpoint é multipart: `movimentacao_financeira_id` vai como campo de formulário, não
   * no corpo JSON (ver a rota `enviar_anexo`). */
  async enviar(movimentacaoId: string, arquivo: File): Promise<AnexoFinanceiro> {
    const formData = new FormData();
    formData.append('movimentacao_financeira_id', movimentacaoId);
    formData.append('arquivo', arquivo);
    const criado = await apiClient.postForm<ApiAnexo>('/anexos-financeiros/', formData);
    return mapear(criado);
  },

  /** Baixa o comprovante com o nome original que a pessoa enviou. O `Content-Disposition` do
   * backend não chega ao download por este caminho (o conteúdo vem como blob), então o nome
   * é remontado aqui. */
  async baixar(anexo: AnexoFinanceiro): Promise<void> {
    const blob = await apiClient.getBlob(`/anexos-financeiros/${anexo.id}/download`);
    salvarArquivo(blob, anexo.nomeOriginal);
  },

  /** Conteúdo do comprovante para visualização na própria tela. Quem chama é responsável por
   * `URL.revokeObjectURL` — abrir em aba nova seria bloqueado como popup, porque a abertura
   * acontece depois do `await`, longe do clique. */
  async obterBlob(anexoId: string): Promise<Blob> {
    return apiClient.getBlob(`/anexos-financeiros/${anexoId}/download`);
  },

  async remover(anexoId: string): Promise<void> {
    await apiClient.delete(`/anexos-financeiros/${anexoId}`);
  }
};
