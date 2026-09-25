export interface Member {
  id: string;
  pessoaId: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  // Campos marcados pela associacao no questionario do DER: as colunas sempre existiram em
  // `pessoas` e a API sempre os aceitou, mas nenhuma tela os preenchia.
  gender: string;
  maritalStatus: string;
  occupation: string;
  education: string;
  motherName: string;
  fatherName: string;
  /** Responsável legal, preenchido quando a pessoa é menor de idade. */
  guardianName: string;
  guardianPhone: string;
  temFoto: boolean;
  phone: string;
  whatsapp: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  entryDate: string;
  // 'AFASTADO' era só um conceito de mock: o backend (Membro.ativo) só distingue ativo/inativo.
  status: 'ATIVO' | 'INATIVO';
  cargoId?: string;
  cargoName?: string;
  notes?: string;
}

export interface Volunteer {
  id: string;
  pessoaId: string;
  name: string;
  email: string;
  phone: string;
  /** O telefone principal tem WhatsApp. */
  whatsapp: boolean;
  // Área é texto livre no backend (Voluntario.area) — não um enum fechado.
  area: string;
  skills: string[];
  availability: string; // Ex: "Sábados à tarde", "Segundas e Quartas" (Voluntario.disponibilidade)
  status: 'ATIVO' | 'INATIVO';
  temFoto: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  // Tipo é texto livre no backend (Atendimento.tipo) — não um enum fechado.
  type: string;
  responsibleName: string;
  notes: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  cpf?: string;
  ageGroup: 'Criança (0-12)' | 'Adolescente (13-17)' | 'Adulto (18-59)' | 'Idoso (60+)' | 'Não informado';
  birthDate: string;
  phone?: string;
  entryDate: string;
  status: 'EM_ATENDIMENTO' | 'CONCLUIDO';
  attendances: AttendanceRecord[];
}

/** Voluntário vinculado a um projeto (tabela projeto_voluntarios). */
export interface ProjectVolunteerLink {
  /** Id do vínculo, não do voluntário — é ele que a remoção usa. */
  id: string;
  volunteerId: string;
  personName: string;
  area: string | null;
  role: string | null;
  entryDate: string | null;
}

/** Beneficiário vinculado a um projeto (tabela projeto_beneficiarios). */
export interface ProjectBeneficiaryLink {
  /** Id do vínculo, não do beneficiário. */
  id: string;
  beneficiaryId: string;
  personName: string;
  role: string | null;
  entryDate: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  // null quando o projeto não tem responsável vinculado (Projeto.responsavel_id é opcional).
  responsibleName: string | null;
  responsibleId?: string;
  eventsCount: number;
  totalExpenses: number;
  status: string;
  startDate: string | null;
}

export type InscriptionStatus = 'CONFIRMADA' | 'PENDENTE' | 'CANCELADA';

export interface EventInscription {
  id: string;
  pessoaId: string;
  participantName: string;
  participantPhone: string;
  inscriptionDate: string;
  status: InscriptionStatus;
  notes?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string;
  responsibleName: string | null;
  projectId?: string;
  // Categoria não existe como coluna no backend (Evento não tem "categoria") — mantido
  // apenas como texto livre digitado pelo usuário via observações, não filtrável de verdade.
  targetAudience: string;
  maxSlots: number | null;
  filledSlots: number;
  requiresRegistration: boolean;
  status: 'AGENDADO' | 'REALIZADO';
  inscriptions?: EventInscription[];
}

export interface FinancialTransaction {
  id: string;
  type: 'RECEITA' | 'DESPESA';
  // Categoria e conta são entidades reais do backend (CategoriaFinanceira/ContaFinanceira),
  // não mais um enum fixo no frontend.
  category: string;
  categoryId: string;
  accountId: string;
  accountName: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string | null;
  responsibleName: string | null;
  projectId?: string;
  projectName?: string;
  status: string;
  attachmentsCount: number;
}
