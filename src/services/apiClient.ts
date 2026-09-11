import { getSession, clearSession } from './session';

const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Chamado quando o backend recusa o token (401) — permite que o AuthContext reaja
 * (ex.: encerrar a sessão e redirecionar para o login). Registrado pela tarefa 27. */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  return headers;
}

async function extrairMensagemDeErro(response: Response): Promise<string> {
  const tipoConteudo = response.headers.get('content-type') ?? '';
  if (tipoConteudo.includes('application/json')) {
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') return data.detail;
      if (Array.isArray(data?.detail)) {
        // Erros de validação do FastAPI/Pydantic vêm como lista de objetos {loc, msg, ...}
        return data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join('; ');
      }
      return JSON.stringify(data);
    } catch {
      return `Erro HTTP ${response.status}`;
    }
  }
  return `Erro HTTP ${response.status}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const temCorpo = body !== undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(temCorpo),
    body: temCorpo ? JSON.stringify(body) : undefined
  });

  if (response.status === 401) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extrairMensagemDeErro(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const tipoConteudo = response.headers.get('content-type') ?? '';
  if (tipoConteudo.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

async function requestForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  // Sem Content-Type manual: o browser define o boundary do multipart/form-data sozinho.

  const response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: formData });

  if (response.status === 401) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }
  if (!response.ok) {
    throw new ApiError(response.status, await extrairMensagemDeErro(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const tipoConteudo = response.headers.get('content-type') ?? '';
  if (tipoConteudo.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

/** Busca um recurso binário (ex.: foto, comprovante) autenticado e retorna um Blob — usado
 * quando o elemento consumidor (ex.: <img>) não consegue enviar o header Authorization sozinho. */
async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: buildHeaders(false) });

  if (response.status === 401) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }
  if (!response.ok) {
    throw new ApiError(response.status, await extrairMensagemDeErro(response));
  }
  return response.blob();
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
  postForm: <T>(path: string, formData: FormData): Promise<T> => requestForm<T>('POST', path, formData),
  getBlob: (path: string): Promise<Blob> => requestBlob(path)
};

