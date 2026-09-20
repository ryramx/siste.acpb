import { Member, Volunteer, Beneficiary, Project, EventItem, EventInscription, FinancialTransaction, AttendanceRecord } from '../types/domain';
import { apiClient } from './apiClient';

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
  data_nascimento: string | null;
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
  birthDate: pessoa.data_nascimento ?? '',
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
  birthDate: string;
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
        data_nascimento: data.birthDate || null,
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
    if (data.birthDate !== undefined) pessoaPatch.data_nascimento = data.birthDate || null;
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
  area: voluntario.area ?? 'Não informada',
  skills: voluntario.habilidades ? voluntario.habilidades.split(',').map((s) => s.trim()).filter(Boolean) : [],
  availability: voluntario.disponibilidade ?? 'Não informada',
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
  status: string;
  observacoes: string | null;
}

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
        return toEventItem(e, nome, inscricoes.length);
      })
    );
  },

  async getById(id: string): Promise<EventItem | undefined> {
    const e = await apiClient.get<ApiEvento>(`/eventos/${id}`);
    const nome = await resolverNomePessoa(e.responsavel_id, new Map());
    const inscricoes = await apiClient.get<ApiInscricao[]>(`/inscricoes/?evento_id=${e.id}`);
    const pessoasCache = new Map<number, string>();
    const inscriptions: EventInscription[] = await Promise.all(
      inscricoes.map(async (i) => ({
        id: String(i.id),
        participantName: (await resolverNomePessoa(i.pessoa_id, pessoasCache)) ?? '',
        participantPhone: '',
        inscriptionDate: i.data_inscricao,
        status: i.status
      }))
    );
    return { ...toEventItem(e, nome, inscricoes.length), inscriptions };
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
  }
};

export const inscricaoService = {
  async criar(eventoId: string, pessoaId: string): Promise<void> {
    await apiClient.post('/inscricoes/', {
      pessoa_id: Number(pessoaId),
      evento_id: Number(eventoId),
      data_inscricao: new Date().toISOString(),
      status: 'CONFIRMADA'
    });
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
}

interface ApiCategoriaFinanceira {
  id: number;
  nome: string;
  tipo: string;
}

export interface OpcaoFinanceira {
  id: string;
  nome: string;
}

async function carregarContas(): Promise<ApiContaFinanceira[]> {
  return apiClient.get<ApiContaFinanceira[]>('/contas-financeiras/');
}

async function carregarCategorias(): Promise<ApiCategoriaFinanceira[]> {
  return apiClient.get<ApiCategoriaFinanceira[]>('/categorias-financeiras/');
}

export const financialService = {
  async listarContas(): Promise<OpcaoFinanceira[]> {
    const contas = await carregarContas();
    return contas.map((c) => ({ id: String(c.id), nome: c.nome }));
  },

  /** tipo: 'RECEITA' | 'DESPESA' — filtra as categorias cadastradas para o tipo correspondente
   * (ENTRADA/SAIDA no backend). */
  async listarCategorias(tipo: 'RECEITA' | 'DESPESA'): Promise<OpcaoFinanceira[]> {
    const tipoBackend = tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA';
    const categorias = await carregarCategorias();
    return categorias
      .filter((c) => c.tipo.toUpperCase() === tipoBackend)
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
  }
};
