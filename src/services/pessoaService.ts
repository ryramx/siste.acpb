import { apiClient } from './apiClient';
import { apenasDigitos } from '../utils/mascaras';

/** Uma Pessoa do cadastro, com os vínculos que ela tem com a associação.
 *
 * O sistema separa a Pessoa dos seus vínculos (membro, voluntário, beneficiário, usuário):
 * a mesma pessoa pode ser várias coisas ao mesmo tempo, e pode não ser nenhuma. Até aqui não
 * havia tela para a Pessoa em si — ela só era criada de dentro do formulário de um vínculo, e
 * uma pessoa sem vínculo (ou com o vínculo encerrado) ficava inalcançável pela interface,
 * embora o backend sempre tenha tido o CRUD completo.
 */
export interface Pessoa {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  rg: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  email: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  escolaridade: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  temFoto: boolean;
  /** Conta que existe para operar o sistema, não uma pessoa da associação (ver
   * `Pessoa.conta_tecnica` no backend). Fica fora das listas de escolher pessoa. */
  contaTecnica: boolean;
  vinculos: VinculoDePessoa[];
}

export type VinculoDePessoa = 'membro' | 'voluntario' | 'beneficiario' | 'usuario';

export interface ListagemDePessoas {
  pessoas: Pessoa[];
  /** `false` quando alguma lista de vínculo não pôde ser lida por falta de permissão — aí não
   * se pode afirmar que uma pessoa está "sem vínculo", só que não se sabe. */
  vinculosCompletos: boolean;
}

/** Campos editáveis pela tela. Todos opcionais exceto o nome, como no backend. */
export interface DadosDePessoa {
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  email?: string;
  estadoCivil?: string;
  profissao?: string;
  escolaridade?: string;
  nomeMae?: string;
  nomePai?: string;
  responsavelNome?: string;
  responsavelTelefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

interface ApiPessoa {
  id: number;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  email: string | null;
  estado_civil: string | null;
  profissao: string | null;
  escolaridade: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  tem_foto: boolean;
  conta_tecnica: boolean;
}

function mapear(p: ApiPessoa, vinculos: VinculoDePessoa[] = []): Pessoa {
  return {
    id: String(p.id),
    nomeCompleto: p.nome_completo,
    cpf: p.cpf,
    rg: p.rg,
    dataNascimento: p.data_nascimento,
    sexo: p.sexo,
    email: p.email,
    estadoCivil: p.estado_civil,
    profissao: p.profissao,
    escolaridade: p.escolaridade,
    nomeMae: p.nome_mae,
    nomePai: p.nome_pai,
    responsavelNome: p.responsavel_nome,
    responsavelTelefone: p.responsavel_telefone,
    endereco: p.endereco,
    bairro: p.bairro,
    cidade: p.cidade,
    estado: p.estado,
    cep: p.cep,
    temFoto: p.tem_foto,
    contaTecnica: p.conta_tecnica,
    vinculos
  };
}

/** Converte o formulário no corpo que o backend espera.
 *
 * Campo vazio vira `null`, não string vazia: um CPF `''` gravado passaria pela restrição de
 * unicidade apenas na primeira vez — a segunda pessoa sem CPF colidiria com a primeira. Com
 * `null`, o Postgres não considera duplicidade.
 */
export function corpoDePessoa(dados: DadosDePessoa): Record<string, unknown> {
  const ouNulo = (valor: string | undefined) => {
    const limpo = (valor ?? '').trim();
    return limpo === '' ? null : limpo;
  };

  return {
    nome_completo: dados.nomeCompleto.trim(),
    // CPF, telefone e CEP são guardados só com dígitos: é assim que os outros cadastros
    // gravam, e uma máscara persistida quebraria a busca por CPF digitado sem pontuação.
    cpf: dados.cpf && apenasDigitos(dados.cpf) ? apenasDigitos(dados.cpf) : null,
    rg: ouNulo(dados.rg),
    data_nascimento: ouNulo(dados.dataNascimento),
    sexo: ouNulo(dados.sexo),
    email: ouNulo(dados.email),
    estado_civil: ouNulo(dados.estadoCivil),
    profissao: ouNulo(dados.profissao),
    escolaridade: ouNulo(dados.escolaridade),
    nome_mae: ouNulo(dados.nomeMae),
    nome_pai: ouNulo(dados.nomePai),
    responsavel_nome: ouNulo(dados.responsavelNome),
    responsavel_telefone: dados.responsavelTelefone
      ? apenasDigitos(dados.responsavelTelefone) || null
      : null,
    endereco: ouNulo(dados.endereco),
    bairro: ouNulo(dados.bairro),
    cidade: ouNulo(dados.cidade),
    estado: ouNulo(dados.estado),
    cep: dados.cep && apenasDigitos(dados.cep) ? apenasDigitos(dados.cep) : null
  };
}

/** Lê uma lista de vínculos e devolve os `pessoa_id` que aparecem nela. Um 403 vira "não sei",
 * não zero: quem não pode ver voluntários não deve concluir que ninguém é voluntário. */
async function idsDeVinculo(
  caminho: string
): Promise<{ ids: Set<number>; lido: boolean }> {
  try {
    const registros = await apiClient.get<{ pessoa_id: number }[]>(caminho);
    return { ids: new Set(registros.map((r) => r.pessoa_id)), lido: true };
  } catch {
    return { ids: new Set(), lido: false };
  }
}

export const pessoaService = {
  /** Lista as pessoas com seus vínculos.
   *
   * As quatro listas de vínculo são quatro requisições no total, não por pessoa: o volume do
   * cadastro da associação é de centenas de linhas, e resolver vínculo por pessoa seria uma
   * requisição por linha.
   *
   * `excluir_tecnicas` fica de fora de propósito: esta é a tela do cadastro, e é o único lugar
   * em que uma conta técnica precisa ser visível para poder ser corrigida.
   */
  async listar(): Promise<ListagemDePessoas> {
    const [pessoas, membros, voluntarios, beneficiarios, usuarios] = await Promise.all([
      apiClient.get<ApiPessoa[]>('/pessoas/'),
      idsDeVinculo('/membros/'),
      idsDeVinculo('/voluntarios/'),
      idsDeVinculo('/beneficiarios/'),
      idsDeVinculo('/usuarios/')
    ]);

    return {
      pessoas: pessoas.map((p) => {
        const vinculos: VinculoDePessoa[] = [];
        if (membros.ids.has(p.id)) vinculos.push('membro');
        if (voluntarios.ids.has(p.id)) vinculos.push('voluntario');
        if (beneficiarios.ids.has(p.id)) vinculos.push('beneficiario');
        if (usuarios.ids.has(p.id)) vinculos.push('usuario');
        return mapear(p, vinculos);
      }),
      vinculosCompletos:
        membros.lido && voluntarios.lido && beneficiarios.lido && usuarios.lido
    };
  },

  async obter(id: string): Promise<Pessoa> {
    return mapear(await apiClient.get<ApiPessoa>(`/pessoas/${id}`));
  },

  async criar(dados: DadosDePessoa): Promise<Pessoa> {
    return mapear(await apiClient.post<ApiPessoa>('/pessoas/', corpoDePessoa(dados)));
  },

  async atualizar(id: string, dados: DadosDePessoa): Promise<Pessoa> {
    return mapear(await apiClient.put<ApiPessoa>(`/pessoas/${id}`, corpoDePessoa(dados)));
  },

  /** Exclusão física, permitida só a quem tem `pessoas.excluir` (hoje apenas Administrador).
   * O banco recusa (409) enquanto houver qualquer registro dependente — é o que protege o
   * histórico de quem já participou de algo. */
  async excluir(id: string): Promise<void> {
    await apiClient.delete(`/pessoas/${id}`);
  }
};
