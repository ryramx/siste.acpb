import { getSession, clearSession } from './session';

/** URL da API, definida por ambiente em tempo de build (`VITE_API_URL`).
 *
 * O fallback só serve ao desenvolvimento local: um build de produção sem essa variável
 * apontaria para a máquina de quem compilou, e o sistema não carregaria nada para
 * ninguém. Por isso o build de produção falha explicitamente em vez de usar o fallback.
 */
const API_BASE_URL: string = (() => {
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) return configurada.replace(/\/$/, '');
  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL não definida no build de produção. Configure a variável de ambiente ' +
        'na plataforma de deploy (ver backend/DEPLOY.md) antes de gerar o build.'
    );
  }
  // Porta 8001 (e nao a 8000 padrao) para nao colidir com outro projeto rodando na
  // mesma maquina - ver a secao de desenvolvimento local em backend/DEPLOY.md.
  return 'http://127.0.0.1:8001';
})();

/** Por que a chamada falhou. As telas tratam cada caso de um jeito.
 *
 * - `offline`: o aparelho diz não ter rede. Vale avisar na hora.
 * - `inalcancavel`: a conexão nem chegou a ser estabelecida (DNS, recusada, sinal caiu no
 *    meio). Falha rápido, e também vale avisar.
 * - `demorou`: a conexão foi estabelecida e o servidor não respondeu a tempo. No plano
 *    gratuito do Render o serviço hiberna quando fica ocioso, e o primeiro acesso espera ele
 *    subir -- e isso não é problema de internet do usuário.
 * - `http`: o servidor respondeu, com um código de erro. */
export type TipoDeFalha = 'offline' | 'inalcancavel' | 'demorou' | 'http';

export class ApiError extends Error {
  status: number;
  tipo: TipoDeFalha;

  constructor(status: number, message: string, tipo: TipoDeFalha = 'http') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.tipo = tipo;
  }

  /** Falha de rede do lado do usuário, que faz sentido mostrar na tela. Um servidor
   * hibernando não entra aqui: quem esperar um pouco mais é atendido. */
  get ehProblemaDeConexao(): boolean {
    return this.tipo === 'offline' || this.tipo === 'inalcancavel';
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

/** Tempo-limite das chamadas.
 *
 * Existe porque, no celular, uma requisição feita ao perder o sinal não falha sozinha: fica
 * pendurada, e a tela some no "Carregando..." para sempre.
 *
 * O valor é generoso de propósito. A API roda no plano gratuito do Render, que hiberna o
 * serviço quando fica ocioso; o primeiro acesso depois disso espera o servidor subir, o que
 * passa folgadamente de meio minuto. Com um limite curto, quem abria o sistema de manhã via
 * um aviso de falha de conexão quando a conexão estava perfeita -- só o servidor é que
 * estava acordando.
 *
 * Cortar cedo não ajudaria ninguém nesse caso: a espera é a mesma, e o aviso só mente sobre
 * a causa. Quem está mesmo sem rede não depende deste limite para descobrir -- cai nos dois
 * casos rápidos tratados abaixo. */
const TIMEOUT_PADRAO_MS = 75000;
const TIMEOUT_UPLOAD_MS = 120000;

/** Aviso de espera longa.
 *
 * Com o tempo-limite de 75s, um servidor hibernando deixa a tela carregando por até um minuto
 * sem dizer nada. Tecnicamente correto, mas parece travamento para quem não sabe que o plano
 * gratuito do Render desliga o serviço quando ele fica ocioso.
 *
 * Fica aqui, e não em cada tela, porque o apiClient é o único lugar que sabe quais chamadas
 * estão pendentes -- e assim vale para qualquer tela, inclusive o login e a abertura do app.
 *
 * O aviso só aparece depois do limiar: uma chamada normal termina muito antes e ninguém vê
 * nada. */
const LIMIAR_ESPERA_LONGA_MS = 10000;

type OuvinteDeEspera = (esperando: boolean) => void;

const ouvintes = new Set<OuvinteDeEspera>();
let chamadasPendentes = 0;
let temporizadorDoAviso: ReturnType<typeof setTimeout> | null = null;
let avisando = false;

function notificar(novoEstado: boolean): void {
  if (avisando === novoEstado) return;
  avisando = novoEstado;
  ouvintes.forEach((ouvinte) => ouvinte(novoEstado));
}

/** Avisa quando alguma chamada passa do limiar, e quando todas terminam. */
export function assinarEsperaLonga(ouvinte: OuvinteDeEspera): () => void {
  ouvintes.add(ouvinte);
  ouvinte(avisando);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function registrarChamada(): () => void {
  chamadasPendentes += 1;
  if (temporizadorDoAviso === null) {
    temporizadorDoAviso = setTimeout(() => {
      temporizadorDoAviso = null;
      if (chamadasPendentes > 0) notificar(true);
    }, LIMIAR_ESPERA_LONGA_MS);
  }

  let encerrada = false;
  return () => {
    if (encerrada) return;
    encerrada = true;
    chamadasPendentes -= 1;
    if (chamadasPendentes === 0) {
      if (temporizadorDoAviso !== null) {
        clearTimeout(temporizadorDoAviso);
        temporizadorDoAviso = null;
      }
      notificar(false);
    }
  };
}

function estaOffline(): boolean {
  // `navigator.onLine` e conservador: falso so quando o aparelho sabe que nao tem rede.
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function fetchComTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  if (estaOffline()) {
    throw new ApiError(
      0,
      'Sem conexão com a internet. Verifique sua rede e tente de novo.',
      'offline'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const encerrarChamada = registrarChamada();
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw new ApiError(
        0,
        'O servidor demorou demais para responder. Tente de novo em instantes.',
        'demorou'
      );
    }
    // fetch so rejeita assim quando a conexao nem foi estabelecida (DNS, recusada, sinal
    // caiu). E rapido, e e de fato um problema de rede -- diferente do servidor lento.
    throw new ApiError(
      0,
      estaOffline()
        ? 'Sem conexão com a internet. Verifique sua rede e tente de novo.'
        : 'Não foi possível falar com o servidor. Verifique sua conexão.',
      estaOffline() ? 'offline' : 'inalcancavel'
    );
  } finally {
    clearTimeout(timer);
    encerrarChamada();
  }
}

/** Trata a resposta comum a todas as chamadas.
 *
 * `tinhaSessao` distingue os dois 401 possiveis, que antes eram tratados como um só: com sessão,
 * o token expirou ou foi revogado e a mensagem é "Sessão expirada"; sem sessão, a chamada é de
 * login ou de recuperação de senha, e o 401 significa credencial errada -- dizer "Sessão
 * expirada" a quem nunca entrou é confuso e esconde o motivo real. */
async function tratarResposta<T>(response: Response, tinhaSessao: boolean): Promise<T> {
  if (response.status === 401 && tinhaSessao) {
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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const temCorpo = body !== undefined;
  const tinhaSessao = getSession() !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers: buildHeaders(temCorpo),
      body: temCorpo ? JSON.stringify(body) : undefined
    },
    TIMEOUT_PADRAO_MS
  );

  return tratarResposta<T>(response, tinhaSessao);
}

async function requestForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  // Sem Content-Type manual: o browser define o boundary do multipart/form-data sozinho.

  const tinhaSessao = session !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    { method, headers, body: formData },
    TIMEOUT_UPLOAD_MS
  );

  return tratarResposta<T>(response, tinhaSessao);
}

/** Busca um recurso binário (ex.: foto, comprovante) autenticado e retorna um Blob — usado
 * quando o elemento consumidor (ex.: <img>) não consegue enviar o header Authorization sozinho. */
async function requestBlob(path: string): Promise<Blob> {
  const tinhaSessao = getSession() !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    { headers: buildHeaders(false) },
    TIMEOUT_PADRAO_MS
  );

  if (response.status === 401 && tinhaSessao) {
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

