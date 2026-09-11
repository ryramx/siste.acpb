export interface Member {
  id: string;
  pessoaId: string;
  name: string;
  cpf: string;
  birthDate: string;
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

export interface Project {
  id: string;
  name: string;
  description: string;
  // null quando o projeto não tem responsável vinculado (Projeto.responsavel_id é opcional).
  responsibleName: string | null;
  responsibleId?: string;
  // Beneficiários/voluntários vinculados ainda não são expostos por uma rota própria no
  // backend (ver tarefa 30) — só despesas e eventos são derivados de dados reais.
  eventsCount: number;
  totalExpenses: number;
  status: string;
  startDate: string | null;
}

export interface EventInscription {
  id: string;
  participantName: string;
  participantPhone: string;
  inscriptionDate: string;
  status: string;
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
