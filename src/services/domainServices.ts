import { Member, Volunteer, Beneficiary, Project, ProjectVolunteerLink, ProjectBeneficiaryLink, EventItem, EventInscription, InscriptionStatus, FinancialTransaction, AttendanceRecord } from '../types/domain';
import { apiClient } from './apiClient';
import { apenasDigitos } from '../utils/mascaras';

interface ApiMembro {
  id: number;
  pessoa_id: number;
  cargo_id: number;
  data_entrada: string;
  data_saida: string | null;
  motivo_saida: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiPessoa {
  id: number;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  profissao: string | null;
  escolaridade: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  tem_foto: boolean;
}

interface ApiCargo {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface ApiTelefone {
  id: number;
  pessoa_id: number;
  numero: string;
  tipo: string;
  principal: boolean;
  whatsapp: boolean;
}

export interface CargoOption {
  id: string;
  nome: string;
}

async function buscarTelefonePrincipal(pessoaId: number): Promise<ApiTelefone | undefined> {
  const telefones = await apiClient.get<ApiTelefone[]>(`/telefones/?pessoa_id=${pessoaId}`);
  return telefones.find((t) => t.principal) ?? telefones[0];
}

const toMember = (
  membro: ApiMembro,
  pessoa: ApiPessoa,
  cargo: ApiCargo | undefined,
  telefone: ApiTelefone | undefined
): Member => ({
  id: String(membro.id),
  pessoaId: String(pessoa.id),
  name: pessoa.nome_completo,
  cpf: pessoa.cpf ?? '',
  rg: pessoa.rg ?? '',
  birthDate: pessoa.data_nascimento ?? '',
  gender: pessoa.sexo ?? '',
  maritalStatus: pessoa.estado_civil ?? '',
  occupation: pessoa.profissao ?? '',
  education: pessoa.escolaridade ?? '',
  motherName: pessoa.nome_mae ?? '',
  fatherName: pessoa.nome_pai ?? '',
  guardianName: pessoa.responsavel_nome ?? '',
  guardianPhone: pessoa.responsavel_telefone ?? '',
  temFoto: pessoa.tem_foto,
  phone: telefone?.numero ?? '',
  whatsapp: telefone?.whatsapp ? telefone.numero : '',
  email: pessoa.email ?? '',
  cep: pessoa.cep ?? '',
  address: pessoa.endereco ?? '',
  number: '',
  neighborhood: pessoa.bairro ?? '',
  city: pessoa.cidade ?? '',
  state: pessoa.estado ?? '',
  entryDate: membro.data_entrada,
  status: membro.ativo ? 'ATIVO' : 'INATIVO',
  cargoId: cargo ? String(cargo.id) : undefined,
  cargoName: cargo?.nome,
  notes: membro.observacoes ?? undefined
});

export interface NovoMembroInput {
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  occupation: string;
  education: string;
  motherName: string;
  fatherName: string;
  guardianName: string;
  guardianPhone: string;
  phone: string;
  whatsapp: string;
  email: string;
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  entryDate: string;
  cargoId: string;
  notes: string;
}

// Todos os domínios (membros, voluntários, beneficiários, projetos, eventos e financeiro)
// já usam a API real a partir das tarefas 28-31.

async function carregarCargos(): Promise<ApiCargo[]> {
  return apiClient.get<ApiCargo[]>('/cargos/');
}

export const memberService = {
  async listarCargos(): Promise<CargoOption[]> {
    const cargos = await carregarCargos();
    return cargos.filter((c) => c.ativo).map((c) => ({ id: String(c.id), nome: c.nome }));
  },

  async getAll(): Promise<Member[]> {
    const [membros, cargos] = await Promise.all([
      apiClient.get<ApiMembro[]>('/membros/'),
      carregarCargos()
    ]);
    const cargosPorId = new Map(cargos.map((c) => [c.id, c]));

    const pessoas = await Promise.all(
      membros.map((membro) => apiClient.get<ApiPessoa>(`/pessoas/${membro.pessoa_id}`))
    );
    const telefones = await Promise.all(
      membros.map((membro) => buscarTelefonePrincipal(membro.pessoa_id))
    );

    return membros.map((membro, index) =>
      toMember(membro, pessoas[index], cargosPorId.get(membro.cargo_id), telefones[index])
    );
  },

  async getById(id: string): Promise<Member | undefined> {
    const membro = await apiClient.get<ApiMembro>(`/membros/${id}`);
    const [pessoa, cargos, telefone] = await Promise.all([
      apiClient.get<ApiPessoa>(`/pessoas/${membro.pessoa_id}`),
      carregarCargos(),
      buscarTelefonePrincipal(membro.pessoa_id)
    ]);
    const cargo = cargos.find((c) => c.id === membro.cargo_id);
    return toMember(membro, pessoa, cargo, telefone);
  },

  async create(data: NovoMembroInput): Promise<Member> {
    const resultado = await apiClient.post<{
      pessoa: ApiPessoa;
      membro: ApiMembro;
    }>('/cadastros/pessoa-vinculo', {
      pessoa: {
        nome_completo: data.name,
        cpf: data.cpf || null,
        rg: data.rg || null,
        data_nascimento: data.birthDate || null,
        sexo: data.gender || null,
        estado_civil: data.maritalStatus || null,
        profissao: data.occupation || null,
        escolaridade: data.education || null,
        nome_mae: data.motherName || null,
        nome_pai: data.fatherName || null,
        responsavel_nome: data.guardianName || null,
        responsavel_telefone: apenasDigitos(data.guardianPhone) || null,
        email: data.email || null,
        endereco: data.address || null,
        bairro: data.neighborhood || null,
        cidade: data.city || null,
        estado: data.state || null,
        cep: data.cep || null
      },
      papel: 'membro',
      membro: {
        cargo_id: Number(data.cargoId),
        data_entrada: data.entryDate,
        ativo: true,
        observacoes: data.notes || null
      }
    });

    if (data.phone) {
      await apiClient.post('/telefones/', {
        pessoa_id: resultado.pessoa.id,
        numero: data.phone,
        tipo: 'CELULAR',
        principal: true,
        whatsapp: Boolean(data.whatsapp)
      });
    }

    const cargos = await carregarCargos();
    const cargo = cargos.find((c) => c.id === resultado.membro.cargo_id);
    const telefone = await buscarTelefonePrincipal(resultado.pessoa.id);
    return toMember(resultado.membro, resultado.pessoa, cargo, telefone);
  },

  async update(id: string, data: Partial<NovoMembroInput> & { status?: Member['status'] }): Promise<Member> {
    const membroAtual = await apiClient.get<ApiMembro>(`/membros/${id}`);

    const pessoaPatch: Record<string, unknown> = {};
    if (data.name !== undefined) pessoaPatch.nome_completo = data.name;
    if (data.cpf !== undefined) pessoaPatch.cpf = data.cpf || null;
    if (data.rg !== undefined) pessoaPatch.rg = data.rg || null;
    if (data.birthDate !== undefined) pessoaPatch.data_nascimento = data.birthDate || null;
    if (data.gender !== undefined) pessoaPatch.sexo = data.gender || null;
    if (data.maritalStatus !== undefined) pessoaPatch.estado_civil = data.maritalStatus || null;
    if (data.occupation !== undefined) pessoaPatch.profissao = data.occupation || null;
    if (data.education !== undefined) pessoaPatch.escolaridade = data.education || null;
    if (data.motherName !== undefined) pessoaPatch.nome_mae = data.motherName || null;
    if (data.fatherName !== undefined) pessoaPatch.nome_pai = data.fatherName || null;
    if (data.guardianName !== undefined) pessoaPatch.responsavel_nome = data.guardianName || null;
    if (data.guardianPhone !== undefined) {
      // Só dígitos, como os demais telefones do sistema.
      pessoaPatch.responsavel_telefone = apenasDigitos(data.guardianPhone) || null;
    }
    if (data.email !== undefined) pessoaPatch.email = data.email || null;
    if (data.address !== undefined) pessoaPatch.endereco = data.address || null;
    if (data.neighborhood !== undefined) pessoaPatch.bairro = data.neighborhood || null;
    if (data.city !== undefined) pessoaPatch.cidade = data.city || null;
    if (data.state !== undefined) pessoaPatch.estado = data.state || null;
    if (data.cep !== undefined) pessoaPatch.cep = data.cep || null;
    if (Object.keys(pessoaPatch).length > 0) {
      await apiClient.put(`/pessoas/${membroAtual.pessoa_id}`, pessoaPatch);
    }

    const membroPatch: Record<string, unknown> = {};
    if (data.cargoId !== undefined) membroPatch.cargo_id = Number(data.cargoId);
    if (data.entryDate !== undefined) membroPatch.data_entrada = data.entryDate;
    if (data.notes !== undefined) membroPatch.observacoes = data.notes || null;
    if (data.status !== undefined) membroPatch.ativo = data.status === 'ATIVO';
    const membroAtualizado =
      Object.keys(membroPatch).length > 0
        ? await apiClient.put<ApiMembro>(`/membros/${id}`, membroPatch)
        : membroAtual;

    if (data.phone !== undefined) {
      const telefoneExistente = await buscarTelefonePrincipal(membroAtual.pessoa_id);
      if (telefoneExistente) {
        await apiClient.put(`/telefones/${telefoneExistente.id}`, {
          numero: data.phone,
          whatsapp: Boolean(data.whatsapp)
        });
      } else if (data.phone) {
        await apiClient.post('/telefones/', {
          pessoa_id: membroAtual.pessoa_id,
          numero: data.phone,
          tipo: 'CELULAR',
          principal: true,
          whatsapp: Boolean(data.whatsapp)
        });
      }
    }

    const membroFinal = await this.getById(id);
    if (!membroFinal) throw new Error('Membro não encontrado após atualização');
    return membroFinal;
  },

  /** "Excluir" um membro, na prática, desativa o registro (Membro.ativo=false) — a exclusão
   * física não é permitida para preservar histórico (ver RELACIONAMENTOS.md do backend). */
  async delete(id: string): Promise<void> {
    await apiClient.put(`/membros/${id}`, { ativo: false });
  }
};

interface ApiVoluntario {
  id: number;
  pessoa_id: number;
  data_inicio: string;
  data_fim: string | null;
  area: string | null;
  habilidades: string | null;
  disponibilidade: string | null;
  observacoes: string | null;
}

/** Texto mostrado quando o campo esta vazio no banco (o backend guarda null).
 *
 * Exportada porque quem edita precisa converte-la de volta para vazio: preencher o
 * formulario com "Nao informada" e salvar gravaria essa frase como se fosse a
 * disponibilidade real do voluntario. */
export const NAO_INFORMADA = 'Não informada';

const toVolunteer = (
  voluntario: ApiVoluntario,
  pessoa: ApiPessoa,
  telefone: ApiTelefone | undefined
): Volunteer => ({
  id: String(voluntario.id),
  pessoaId: String(pessoa.id),
  name: pessoa.nome_completo,
  email: pessoa.email ?? '',
  phone: telefone?.numero ?? '',
  whatsapp: telefone?.whatsapp ?? false,
  area: voluntario.area ?? NAO_INFORMADA,
  skills: voluntario.habilidades ? voluntario.habilidades.split(',').map((s) => s.trim()).filter(Boolean) : [],
  availability: voluntario.disponibilidade ?? NAO_INFORMADA,
  status: voluntario.data_fim ? 'INATIVO' : 'ATIVO',
  temFoto: pessoa.tem_foto
});

export const volunteerService = {
  async getAll(): Promise<Volunteer[]> {
    const voluntarios = await apiClient.get<ApiVoluntario[]>('/voluntarios/');
    const pessoas = await Promise.all(
      voluntarios.map((v) => apiClient.get<ApiPessoa>(`/pessoas/${v.pessoa_id}`))
    );
    const telefones = await Promise.all(
      voluntarios.map((v) => buscarTelefonePrincipal(v.pessoa_id))
    );
    return voluntarios.map((v, i) => toVolunteer(v, pessoas[i], telefones[i]));
  },
  async getById(id: string): Promise<Volunteer | undefined> {
    const voluntario = await apiClient.get<ApiVoluntario>(`/voluntarios/${id}`);
    const [pessoa, telefone] = await Promise.all([
      apiClient.get<ApiPessoa>(`/pessoas/${voluntario.pessoa_id}`),
      buscarTelefonePrincipal(voluntario.pessoa_id)
    ]);
    return toVolunteer(voluntario, pessoa, telefone);
  },

  /** Cadastra um voluntário, reaproveitando uma Pessoa existente ou criando uma nova.
   *
   * Usa /cadastros/pessoa-vinculo (o mesmo caminho do cadastro de membro) porque Pessoa e o
   * vínculo precisam nascer na mesma transação: criar a Pessoa e falhar no vínculo deixaria
   * um cadastro solto, sem papel nenhum. */
  /** Atualiza os dados do vinculo de voluntario -- area, habilidades e disponibilidade.
   *
   * Campo em branco vira null, e nao string vazia: e assim que o backend representa "nao
   * informado", e e o que `toVolunteer` espera ao ler de volta. Gravar "" faria a lista
   * exibir um campo vazio em vez de "Nao informada". */
  async update(
    id: string,
    data: { area?: string; skills?: string; availability?: string }
  ): Promise<void> {
    await apiClient.put(`/voluntarios/${id}`, {
      area: data.area?.trim() || null,
      habilidades: data.skills?.trim() || null,
      disponibilidade: data.availability?.trim() || null
    });
  },

  async create(data: {
    pessoaId?: string;
    nomeCompleto?: string;
    cpf?: string;
    email?: string;
    startDate: string;
    area?: string;
    skills?: string;
    availability?: string;
  }): Promise<void> {
    await apiClient.post('/cadastros/pessoa-vinculo', {
      ...(data.pessoaId
        ? { pessoa_id: Number(data.pessoaId) }
        : {
            pessoa: {
              nome_completo: data.nomeCompleto,
              cpf: data.cpf ? data.cpf.replace(/\D/g, '') || null : null,
              email: data.email || null
            }
          }),
      papel: 'voluntario',
      voluntario: {
        data_inicio: data.startDate,
        area: data.area || null,
        habilidades: data.skills || null,
        disponibilidade: data.availability || null
      }
    });
  }
};

interface ApiBeneficiario {
  id: number;
  pessoa_id: number;
  data_cadastro: string;
  data_encerramento: string | null;
}

interface ApiAtendimento {
  id: number;
  beneficiario_id: number;
  responsavel_id: number;
  data_atendimento: string;
  tipo: string | null;
  descricao: string | null;
}

function calcularFaixaEtaria(birthDate: string | null): Beneficiary['ageGroup'] {
  if (!birthDate) return 'Não informado';
  const idade = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  if (idade <= 12) return 'Criança (0-12)';
  if (idade <= 17) return 'Adolescente (13-17)';
  if (idade <= 59) return 'Adulto (18-59)';
  return 'Idoso (60+)';
}

async function toBeneficiary(
  beneficiario: ApiBeneficiario,
  pessoa: ApiPessoa,
  telefone: ApiTelefone | undefined
): Promise<Beneficiary> {
  const atendimentos = await apiClient.get<ApiAtendimento[]>(
    `/atendimentos/?beneficiario_id=${beneficiario.id}`
  );
  const responsaveis = await Promise.all(
    atendimentos.map((a) => apiClient.get<ApiPessoa>(`/pessoas/${a.responsavel_id}`))
  );

  return {
    id: String(beneficiario.id),
    name: pessoa.nome_completo,
    cpf: pessoa.cpf ?? undefined,
    ageGroup: calcularFaixaEtaria(pessoa.data_nascimento),
    birthDate: pessoa.data_nascimento ?? '',
    phone: telefone?.numero,
    entryDate: beneficiario.data_cadastro,
    status: beneficiario.data_encerramento ? 'CONCLUIDO' : 'EM_ATENDIMENTO',
    attendances: atendimentos.map((a, i) => ({
      id: String(a.id),
      date: a.data_atendimento,
      type: a.tipo ?? 'Não informado',
      responsibleName: responsaveis[i].nome_completo,
      notes: a.descricao ?? ''
    }))
  };
}

export const beneficiaryService = {
  async getAll(): Promise<Beneficiary[]> {
    const beneficiarios = await apiClient.get<ApiBeneficiario[]>('/beneficiarios/');
    const pessoas = await Promise.all(
      beneficiarios.map((b) => apiClient.get<ApiPessoa>(`/pessoas/${b.pessoa_id}`))
    );
    const telefones = await Promise.all(
      beneficiarios.map((b) => buscarTelefonePrincipal(b.pessoa_id))
    );
    return Promise.all(
      beneficiarios.map((b, i) => toBeneficiary(b, pessoas[i], telefones[i]))
    );
  },
  async getById(id: string): Promise<Beneficiary | undefined> {
    const beneficiario = await apiClient.get<ApiBeneficiario>(`/beneficiarios/${id}`);
    const [pessoa, telefone] = await Promise.all([
      apiClient.get<ApiPessoa>(`/pessoas/${beneficiario.pessoa_id}`),
      buscarTelefonePrincipal(beneficiario.pessoa_id)
    ]);
    return toBeneficiary(beneficiario, pessoa, telefone);
  },

  /** Cadastra um beneficiario, reaproveitando uma Pessoa existente ou criando uma nova.
   * Ver volunteerService.create: mesmo endpoint, mesma razao transacional. */
  async create(data: {
    pessoaId?: string;
    nomeCompleto?: string;
    cpf?: string;
    email?: string;
    registrationDate: string;
    needs?: string;
    socioeconomic?: string;
  }): Promise<void> {
    await apiClient.post('/cadastros/pessoa-vinculo', {
      ...(data.pessoaId
        ? { pessoa_id: Number(data.pessoaId) }
        : {
            pessoa: {
              nome_completo: data.nomeCompleto,
              cpf: data.cpf ? data.cpf.replace(/\D/g, '') || null : null,
              email: data.email || null
            }
          }),
      papel: 'beneficiario',
      beneficiario: {
        data_cadastro: data.registrationDate,
        necessidades: data.needs || null,
        situacao_socioeconomica: data.socioeconomic || null
      }
    });
  },

  async addAttendance(
    beneficiaryId: string,
    attendance: Omit<AttendanceRecord, 'id' | 'responsibleName'> & { responsavelPessoaId: string }
  ): Promise<AttendanceRecord> {
    const criado = await apiClient.post<ApiAtendimento>('/atendimentos/', {
      beneficiario_id: Number(beneficiaryId),
      responsavel_id: Number(attendance.responsavelPessoaId),
      data_atendimento: attendance.date,
      tipo: attendance.type,
      descricao: attendance.notes
    });
    const responsavel = await apiClient.get<ApiPessoa>(`/pessoas/${criado.responsavel_id}`);
    return {
      id: String(criado.id),
      date: criado.data_atendimento,
      type: criado.tipo ?? '',
      responsibleName: responsavel.nome_completo,
      notes: criado.descricao ?? ''
    };
  }
};

interface ApiProjeto {
  id: number;
  nome: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  responsavel_id: number | null;
  orcamento: string | null;
  local: string | null;
  objetivos: string | null;
  observacoes: string | null;
}

interface ApiEvento {
  id: number;
  nome: string;
  descricao: string | null;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  responsavel_id: number | null;
  projeto_id: number | null;
  limite_participantes: number | null;
  exige_inscricao: boolean;
  observacoes: string | null;
}

interface ApiInscricao {
  id: number;
  pessoa_id: number;
  evento_id: number;
  data_inscricao: string;
  status: InscriptionStatus;
  observacoes: string | null;
  // Denormalizados pelo backend (rotas de inscrição) — evitam uma busca de pessoa por linha.
  pessoa_nome: string | null;
  pessoa_telefone: string | null;
}

const toEventInscription = (i: ApiInscricao): EventInscription => ({
  id: String(i.id),
  pessoaId: String(i.pessoa_id),
  participantName: i.pessoa_nome ?? '',
  participantPhone: i.pessoa_telefone ?? '',
  inscriptionDate: i.data_inscricao,
  status: i.status,
  notes: i.observacoes ?? undefined
});

/** Vagas ocupadas: inscrições canceladas ficam no histórico, mas devolvem a vaga
 *  (mesma regra aplicada pelo backend ao aceitar novas inscrições). */
const contarOcupadas = (inscricoes: ApiInscricao[]): number =>
  inscricoes.filter((i) => i.status !== 'CANCELADA').length;

interface ApiDespesaPorProjeto {
  projeto_id: number;
  total_despesas: number;
}

async function despesasPorProjeto(): Promise<Map<number, number>> {
  try {
    const lista = await apiClient.get<ApiDespesaPorProjeto[]>(
      '/dashboard/financeiro/despesas-por-projeto'
    );
    return new Map(lista.map((d) => [d.projeto_id, d.total_despesas]));
  } catch {
    // Usuário sem permissão financeira: segue sem esse dado em vez de quebrar a tela.
    return new Map();
  }
}

async function resolverNomePessoa(
  pessoaId: number | null,
  cache: Map<number, string>
): Promise<string | null> {
  if (pessoaId === null) return null;
  if (!cache.has(pessoaId)) {
    const pessoa = await apiClient.get<ApiPessoa>(`/pessoas/${pessoaId}`);
    cache.set(pessoaId, pessoa.nome_completo);
  }
  return cache.get(pessoaId)!;
}

function toProject(
  p: ApiProjeto,
  responsibleName: string | null,
  eventsCount: number,
  totalExpenses: number
): Project {
  return {
    id: String(p.id),
    name: p.nome,
    description: p.descricao ?? '',
    responsibleName,
    responsibleId: p.responsavel_id ? String(p.responsavel_id) : undefined,
    eventsCount,
    totalExpenses,
    status: p.status,
    startDate: p.data_inicio
  };
}

interface ApiProjetoVoluntario {
  id: number;
  projeto_id: number;
  voluntario_id: number;
  funcao: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  observacoes: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  area: string | null;
}

interface ApiProjetoBeneficiario {
  id: number;
  projeto_id: number;
  beneficiario_id: number;
  papel: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  observacoes: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
}

function toProjectVolunteerLink(v: ApiProjetoVoluntario): ProjectVolunteerLink {
  return {
    id: String(v.id),
    volunteerId: String(v.voluntario_id),
    personName: v.pessoa_nome ?? 'Sem nome',
    area: v.area,
    role: v.funcao,
    entryDate: v.data_entrada
  };
}

function toProjectBeneficiaryLink(b: ApiProjetoBeneficiario): ProjectBeneficiaryLink {
  return {
    id: String(b.id),
    beneficiaryId: String(b.beneficiario_id),
    personName: b.pessoa_nome ?? 'Sem nome',
    role: b.papel,
    entryDate: b.data_entrada
  };
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const [projetos, eventos, despesas] = await Promise.all([
      apiClient.get<ApiProjeto[]>('/projetos/'),
      apiClient.get<ApiEvento[]>('/eventos/'),
      despesasPorProjeto()
    ]);

    const nomesCache = new Map<number, string>();
    return Promise.all(
      projetos.map(async (p) => {
        const nome = await resolverNomePessoa(p.responsavel_id, nomesCache);
        const eventsCount = eventos.filter((e) => e.projeto_id === p.id).length;
        return toProject(p, nome, eventsCount, despesas.get(p.id) ?? 0);
      })
    );
  },

  async getById(id: string): Promise<Project | undefined> {
    const [p, eventos, despesas] = await Promise.all([
      apiClient.get<ApiProjeto>(`/projetos/${id}`),
      apiClient.get<ApiEvento[]>('/eventos/'),
      despesasPorProjeto()
    ]);
    const nome = await resolverNomePessoa(p.responsavel_id, new Map());
    const eventsCount = eventos.filter((e) => e.projeto_id === p.id).length;
    return toProject(p, nome, eventsCount, despesas.get(p.id) ?? 0);
  },

  async create(data: {
    name: string;
    description: string;
    startDate: string;
    status: string;
  }): Promise<Project> {
    const criado = await apiClient.post<ApiProjeto>('/projetos/', {
      nome: data.name,
      descricao: data.description || null,
      data_inicio: data.startDate || null,
      status: data.status
    });
    return toProject(criado, null, 0, 0);
  },

  /** Atualização parcial — só o que for passado é enviado ao backend. */
  async update(
    id: string,
    data: { name?: string; description?: string; status?: string; responsibleId?: string | null }
  ): Promise<Project> {
    const corpo: Record<string, unknown> = {};
    if (data.name !== undefined) corpo.nome = data.name;
    if (data.description !== undefined) corpo.descricao = data.description || null;
    if (data.status !== undefined) corpo.status = data.status;
    // '' no select significa "sem responsável" e precisa virar null, não ser omitido:
    // omitir manteria o responsável antigo (o PUT é parcial, via exclude_unset).
    if (data.responsibleId !== undefined) {
      corpo.responsavel_id = data.responsibleId ? Number(data.responsibleId) : null;
    }

    const atualizado = await apiClient.put<ApiProjeto>(`/projetos/${id}`, corpo);
    const nome = await resolverNomePessoa(atualizado.responsavel_id, new Map());
    const [eventos, despesas] = await Promise.all([
      apiClient.get<ApiEvento[]>('/eventos/'),
      despesasPorProjeto()
    ]);
    const eventsCount = eventos.filter((e) => e.projeto_id === atualizado.id).length;
    return toProject(atualizado, nome, eventsCount, despesas.get(atualizado.id) ?? 0);
  },

  async getVolunteers(projectId: string): Promise<ProjectVolunteerLink[]> {
    const lista = await apiClient.get<ApiProjetoVoluntario[]>(
      `/projetos/${projectId}/voluntarios`
    );
    return lista.map(toProjectVolunteerLink);
  },

  async addVolunteer(
    projectId: string,
    data: { volunteerId: string; role?: string; entryDate?: string }
  ): Promise<ProjectVolunteerLink> {
    const criado = await apiClient.post<ApiProjetoVoluntario>(
      `/projetos/${projectId}/voluntarios`,
      {
        voluntario_id: Number(data.volunteerId),
        funcao: data.role || null,
        data_entrada: data.entryDate || null
      }
    );
    return toProjectVolunteerLink(criado);
  },

  async removeVolunteer(projectId: string, linkId: string): Promise<void> {
    await apiClient.delete(`/projetos/${projectId}/voluntarios/${linkId}`);
  },

  async getBeneficiaries(projectId: string): Promise<ProjectBeneficiaryLink[]> {
    const lista = await apiClient.get<ApiProjetoBeneficiario[]>(
      `/projetos/${projectId}/beneficiarios`
    );
    return lista.map(toProjectBeneficiaryLink);
  },

  async addBeneficiary(
    projectId: string,
    data: { beneficiaryId: string; role?: string; entryDate?: string }
  ): Promise<ProjectBeneficiaryLink> {
    const criado = await apiClient.post<ApiProjetoBeneficiario>(
      `/projetos/${projectId}/beneficiarios`,
      {
        beneficiario_id: Number(data.beneficiaryId),
        papel: data.role || null,
        data_entrada: data.entryDate || null
      }
    );
    return toProjectBeneficiaryLink(criado);
  },

  async removeBeneficiary(projectId: string, linkId: string): Promise<void> {
    await apiClient.delete(`/projetos/${projectId}/beneficiarios/${linkId}`);
  },

  /** Pessoas cadastradas, para escolher o responsável do projeto. */
  async getPessoasParaResponsavel(): Promise<{ id: string; name: string }[]> {
    // excluir_tecnicas: contas que existem para operar o sistema não são gente da associação
    // e não devem poder ser escolhidas para uma atividade por engano.
    const pessoas = await apiClient.get<ApiPessoa[]>('/pessoas/?excluir_tecnicas=true');
    return pessoas
      .map((p) => ({ id: String(p.id), name: p.nome_completo }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
};

function toEventItem(
  e: ApiEvento,
  responsibleName: string | null,
  filledSlots: number
): EventItem {
  return {
    id: String(e.id),
    title: e.nome,
    description: e.descricao ?? '',
    date: e.data_evento,
    time: e.hora_inicio,
    location: e.local ?? '',
    responsibleName,
    projectId: e.projeto_id ? String(e.projeto_id) : undefined,
    targetAudience: e.observacoes ?? '',
    maxSlots: e.limite_participantes,
    filledSlots,
    requiresRegistration: e.exige_inscricao,
    status: e.data_evento < new Date().toISOString().split('T')[0] ? 'REALIZADO' : 'AGENDADO'
  };
}

export const eventService = {
  async getAll(): Promise<EventItem[]> {
    const eventos = await apiClient.get<ApiEvento[]>('/eventos/');
    const nomesCache = new Map<number, string>();
    return Promise.all(
      eventos.map(async (e) => {
        const nome = await resolverNomePessoa(e.responsavel_id, nomesCache);
        const inscricoes = e.exige_inscricao
          ? await apiClient.get<ApiInscricao[]>(`/inscricoes/?evento_id=${e.id}`)
          : [];
        return toEventItem(e, nome, contarOcupadas(inscricoes));
      })
    );
  },

  async getById(id: string): Promise<EventItem | undefined> {
    const e = await apiClient.get<ApiEvento>(`/eventos/${id}`);
    const nome = await resolverNomePessoa(e.responsavel_id, new Map());
    const inscricoes = await apiClient.get<ApiInscricao[]>(`/eventos/${e.id}/inscricoes`);
    return {
      ...toEventItem(e, nome, contarOcupadas(inscricoes)),
      inscriptions: inscricoes.map(toEventInscription)
    };
  },

  async create(data: {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    maxSlots: number;
    requiresRegistration: boolean;
  }): Promise<EventItem> {
    const criado = await apiClient.post<ApiEvento>('/eventos/', {
      nome: data.title,
      descricao: data.description || null,
      data_evento: data.date,
      hora_inicio: data.time || null,
      local: data.location || null,
      limite_participantes: data.maxSlots || null,
      exige_inscricao: data.requiresRegistration
    });
    return toEventItem(criado, null, 0);
  },

  async update(
    id: string,
    data: {
      title: string;
      description: string;
      date: string;
      time: string;
      location: string;
      maxSlots: number | null;
      requiresRegistration: boolean;
    }
  ): Promise<EventItem> {
    const atualizado = await apiClient.put<ApiEvento>(`/eventos/${id}`, {
      nome: data.title,
      descricao: data.description || null,
      data_evento: data.date,
      hora_inicio: data.time || null,
      local: data.location || null,
      limite_participantes: data.maxSlots,
      exige_inscricao: data.requiresRegistration
    });
    const nome = await resolverNomePessoa(atualizado.responsavel_id, new Map());
    return toEventItem(atualizado, nome, 0);
  },

  /** Remove o evento. As inscricoes vinculadas caem junto (cascata no backend). */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/eventos/${id}`);
  }
};

export interface VisitanteAvulsoInput {
  name: string;
  phone: string;
  cpf: string;
  email: string;
  notes: string;
}

export const inscricaoService = {
  async listar(eventoId: string): Promise<EventInscription[]> {
    const inscricoes = await apiClient.get<ApiInscricao[]>(`/eventos/${eventoId}/inscricoes`);
    return inscricoes.map(toEventInscription);
  },

  /** Inscreve alguém que já tem cadastro de Pessoa — membro, voluntário, beneficiário ou
   *  visitante de um evento anterior. */
  async inscreverPessoa(
    eventoId: string,
    pessoaId: string,
    notes?: string
  ): Promise<EventInscription> {
    const criada = await apiClient.post<ApiInscricao>(`/eventos/${eventoId}/inscricoes`, {
      pessoa_id: Number(pessoaId),
      status: 'CONFIRMADA',
      observacoes: notes || null
    });
    return toEventInscription(criada);
  },

  /** Inscreve um visitante ainda sem cadastro: o backend cria a Pessoa (sem papel de
   *  membro/voluntário/beneficiário) e a inscrição na mesma transação. */
  async inscreverAvulso(
    eventoId: string,
    dados: VisitanteAvulsoInput
  ): Promise<EventInscription> {
    const criada = await apiClient.post<ApiInscricao>(`/eventos/${eventoId}/inscricoes/avulsa`, {
      nome_completo: dados.name,
      telefone: dados.phone ? apenasDigitos(dados.phone) : null,
      cpf: dados.cpf ? apenasDigitos(dados.cpf) : null,
      email: dados.email || null,
      status: 'CONFIRMADA',
      observacoes: dados.notes || null
    });
    return toEventInscription(criada);
  },

  async alterarStatus(
    inscricaoId: string,
    status: InscriptionStatus
  ): Promise<EventInscription> {
    const atualizada = await apiClient.put<ApiInscricao>(`/inscricoes/${inscricaoId}`, { status });
    return toEventInscription(atualizada);
  },

  async remover(inscricaoId: string): Promise<void> {
    await apiClient.delete(`/inscricoes/${inscricaoId}`);
  },

  /** Pessoas ainda não inscritas no evento, para o seletor do modal. */
  async listarPessoasDisponiveis(eventoId: string): Promise<{ id: string; name: string }[]> {
    const [pessoas, inscritas] = await Promise.all([
      apiClient.get<ApiPessoa[]>('/pessoas/?excluir_tecnicas=true'),
      apiClient.get<ApiInscricao[]>(`/eventos/${eventoId}/inscricoes`)
    ]);
    const jaInscritas = new Set(inscritas.map((i) => i.pessoa_id));
    return pessoas
      .filter((p) => !jaInscritas.has(p.id))
      .map((p) => ({ id: String(p.id), name: p.nome_completo }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
};

interface ApiMovimentacao {
  id: number;
  conta_financeira_id: number;
  categoria_id: number;
  projeto_id: number | null;
  responsavel_id: number;
  tipo: string;
  descricao: string;
  valor: string;
  data_movimentacao: string;
  forma_pagamento: string | null;
  status: string;
}

interface ApiContaFinanceira {
  id: number;
  nome: string;
  ativo: boolean;
}

interface ApiCategoriaFinanceira {
  id: number;
  nome: string;
  tipo: string;
  ativo: boolean;
}

export interface OpcaoFinanceira {
  id: string;
  nome: string;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  ativo: boolean;
}

export interface ContaFinanceira {
  id: string;
  nome: string;
  ativo: boolean;
}

async function carregarContas(): Promise<ApiContaFinanceira[]> {
  return apiClient.get<ApiContaFinanceira[]>('/contas-financeiras/');
}

async function carregarCategorias(): Promise<ApiCategoriaFinanceira[]> {
  return apiClient.get<ApiCategoriaFinanceira[]>('/categorias-financeiras/');
}

export const financialService = {
  /** Projetos para o select de lançamento. Difere de `projectService.getAll()`, que também
   * busca eventos e despesas de cada projeto -- caro demais para preencher um campo. */
  async listarProjetos(): Promise<OpcaoFinanceira[]> {
    const projetos = await apiClient.get<ApiProjeto[]>('/projetos/');
    return projetos.map((p) => ({ id: String(p.id), nome: p.nome }));
  },

  async listarContas(): Promise<OpcaoFinanceira[]> {
    const contas = await carregarContas();
    return contas.filter((c) => c.ativo).map((c) => ({ id: String(c.id), nome: c.nome }));
  },

  /** Categorias e contas para a tela de gestao -- inclui as inativas, que a de lancamento
   * nao deve oferecer mas esta precisa listar para poder reativar. */
  async listarCategoriasCompleto(): Promise<CategoriaFinanceira[]> {
    const categorias = await carregarCategorias();
    return categorias.map((c) => ({
      id: String(c.id),
      nome: c.nome,
      tipo: c.tipo.toUpperCase() === 'ENTRADA' ? 'RECEITA' : 'DESPESA',
      ativo: c.ativo
    }));
  },

  async criarCategoria(data: { nome: string; tipo: 'RECEITA' | 'DESPESA' }): Promise<void> {
    await apiClient.post('/categorias-financeiras/', {
      nome: data.nome.trim(),
      tipo: data.tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA',
      descricao: null,
      ativo: true
    });
  },

  /** Nao ha exclusao: uma categoria ja usada em lancamentos nao pode sumir sem levar junto o
   * historico. Desativar a tira das listas de lancamento e preserva o que ja foi registrado. */
  async definirCategoriaAtiva(id: string, ativo: boolean): Promise<void> {
    await apiClient.put(`/categorias-financeiras/${id}`, { ativo });
  },

  async listarContasCompleto(): Promise<ContaFinanceira[]> {
    const contas = await carregarContas();
    return contas.map((c) => ({ id: String(c.id), nome: c.nome, ativo: c.ativo }));
  },

  async criarConta(data: { nome: string; tipo: string; saldoInicial: number }): Promise<void> {
    await apiClient.post('/contas-financeiras/', {
      nome: data.nome.trim(),
      tipo: data.tipo,
      banco: null,
      agencia: null,
      numero_conta: null,
      saldo_inicial: data.saldoInicial,
      ativo: true,
      observacoes: null
    });
  },

  async definirContaAtiva(id: string, ativo: boolean): Promise<void> {
    await apiClient.put(`/contas-financeiras/${id}`, { ativo });
  },

  /** tipo: 'RECEITA' | 'DESPESA' — filtra as categorias cadastradas para o tipo correspondente
   * (ENTRADA/SAIDA no backend). */
  async listarCategorias(tipo: 'RECEITA' | 'DESPESA'): Promise<OpcaoFinanceira[]> {
    const tipoBackend = tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA';
    const categorias = await carregarCategorias();
    return categorias
      // Inativa nao e oferecida em lancamento novo, mas continua valendo no que ja existe.
      .filter((c) => c.ativo && c.tipo.toUpperCase() === tipoBackend)
      .map((c) => ({ id: String(c.id), nome: c.nome }));
  },

  async getAll(): Promise<FinancialTransaction[]> {
    const [movimentacoes, contas, categorias] = await Promise.all([
      apiClient.get<ApiMovimentacao[]>('/movimentacoes-financeiras/'),
      carregarContas(),
      carregarCategorias()
    ]);
    const contasPorId = new Map(contas.map((c) => [c.id, c.nome]));
    const categoriasPorId = new Map(categorias.map((c) => [c.id, c.nome]));
    const pessoasCache = new Map<number, string>();
    const projetosCache = new Map<number, string>();

    return Promise.all(
      movimentacoes.map(async (m) => {
        const responsavel = await resolverNomePessoa(m.responsavel_id, pessoasCache);
        let projectName: string | undefined;
        if (m.projeto_id !== null) {
          if (!projetosCache.has(m.projeto_id)) {
            const p = await apiClient.get<ApiProjeto>(`/projetos/${m.projeto_id}`);
            projetosCache.set(m.projeto_id, p.nome);
          }
          projectName = projetosCache.get(m.projeto_id);
        }
        let attachmentsCount = 0;
        try {
          const anexos = await apiClient.get<unknown[]>(
            `/anexos-financeiros/?movimentacao_financeira_id=${m.id}`
          );
          attachmentsCount = anexos.length;
        } catch {
          attachmentsCount = 0;
        }

        return {
          id: String(m.id),
          type: m.tipo.toUpperCase() === 'ENTRADA' ? 'RECEITA' : 'DESPESA',
          category: categoriasPorId.get(m.categoria_id) ?? 'Não categorizado',
          categoryId: String(m.categoria_id),
          accountId: String(m.conta_financeira_id),
          accountName: contasPorId.get(m.conta_financeira_id) ?? 'Conta desconhecida',
          amount: Number(m.valor),
          date: m.data_movimentacao,
          description: m.descricao,
          paymentMethod: m.forma_pagamento,
          responsibleName: responsavel,
          projectId: m.projeto_id ? String(m.projeto_id) : undefined,
          projectName,
          status: m.status,
          attachmentsCount
        } satisfies FinancialTransaction;
      })
    );
  },

  async create(data: {
    type: 'RECEITA' | 'DESPESA';
    categoryId: string;
    accountId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod: string;
    status: string;
    responsavelPessoaId: string;
    projectId?: string;
  }): Promise<FinancialTransaction> {
    const criado = await apiClient.post<ApiMovimentacao>('/movimentacoes-financeiras/', {
      conta_financeira_id: Number(data.accountId),
      categoria_id: Number(data.categoryId),
      projeto_id: data.projectId ? Number(data.projectId) : null,
      responsavel_id: Number(data.responsavelPessoaId),
      tipo: data.type === 'RECEITA' ? 'ENTRADA' : 'SAIDA',
      descricao: data.description,
      valor: data.amount,
      data_movimentacao: data.date,
      forma_pagamento: data.paymentMethod,
      status: data.status
    });

    const [contas, categorias] = await Promise.all([carregarContas(), carregarCategorias()]);
    const conta = contas.find((c) => c.id === criado.conta_financeira_id);
    const categoria = categorias.find((c) => c.id === criado.categoria_id);

    return {
      id: String(criado.id),
      type: data.type,
      category: categoria?.nome ?? 'Não categorizado',
      categoryId: String(criado.categoria_id),
      accountId: String(criado.conta_financeira_id),
      accountName: conta?.nome ?? 'Conta desconhecida',
      amount: Number(criado.valor),
      date: criado.data_movimentacao,
      description: criado.descricao,
      paymentMethod: criado.forma_pagamento,
      responsibleName: null,
      status: criado.status,
      attachmentsCount: 0
    };
  },

  /** Corrige um lancamento. Campos omitidos ficam como estao (o PUT e parcial no backend). */
  async update(
    id: string,
    data: {
      description?: string;
      amount?: number;
      date?: string;
      status?: string;
      paymentMethod?: string | null;
      categoryId?: string;
      accountId?: string;
      /** String vazia desvincula o lançamento do projeto; `undefined` deixa como está. */
      projectId?: string;
    }
  ): Promise<void> {
    const corpo: Record<string, unknown> = {};
    if (data.description !== undefined) corpo.descricao = data.description;
    if (data.amount !== undefined) corpo.valor = data.amount;
    if (data.date !== undefined) corpo.data_movimentacao = data.date;
    if (data.status !== undefined) corpo.status = data.status;
    if (data.paymentMethod !== undefined) corpo.forma_pagamento = data.paymentMethod;
    if (data.categoryId !== undefined) corpo.categoria_id = Number(data.categoryId);
    if (data.accountId !== undefined) corpo.conta_financeira_id = Number(data.accountId);
    if (data.projectId !== undefined) {
      corpo.projeto_id = data.projectId ? Number(data.projectId) : null;
    }
    await apiClient.put(`/movimentacoes-financeiras/${id}`, corpo);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/movimentacoes-financeiras/${id}`);
  }
};
