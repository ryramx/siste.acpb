import { apenasDigitos } from '../utils/mascaras';

/** Consulta de endereço por CEP no ViaCEP (https://viacep.com.br).
 *
 * Serviço público brasileiro, sem cadastro nem chave de API, com CORS liberado — por isso a
 * chamada sai direto do navegador em vez de passar pelo nosso backend. Não vale intermediar:
 * o dado é público, não envolve autenticação, e um proxy só acrescentaria uma ida e volta
 * (e mais um caminho para falhar) sem ganho de segurança.
 *
 * Nada aqui é obrigatório para o cadastro: se o serviço estiver fora do ar ou o CEP não
 * existir, o formulário continua preenchível à mão. É conveniência, não dependência.
 */

const VIACEP_URL = 'https://viacep.com.br/ws';
const TIMEOUT_MS = 8000;

export interface EnderecoPorCEP {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export class CEPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CEPError';
  }
}

interface RespostaViaCEP {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoPorCEP> {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) {
    throw new CEPError('CEP deve ter 8 dígitos');
  }

  // Timeout explícito: sem ele, um serviço externo lento deixaria o campo "buscando..."
  // indefinidamente, e o usuário não saberia se deve esperar ou digitar à mão.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${VIACEP_URL}/${digitos}/json/`, { signal: controller.signal });
  } catch {
    throw new CEPError('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    throw new CEPError('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
  }

  const dados: RespostaViaCEP = await resposta.json();

  // O ViaCEP responde 200 com `{"erro": true}` para CEP inexistente, em vez de 404 — daí a
  // checagem no corpo e não no status. Em algumas respostas o campo vem como a string "true".
  if (dados.erro === true || dados.erro === 'true') {
    throw new CEPError('CEP não encontrado');
  }

  return {
    logradouro: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    estado: dados.uf ?? ''
  };
}
