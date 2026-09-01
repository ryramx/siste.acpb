export interface Member {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  photoUrl?: string;
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
  status: 'ATIVO' | 'AFASTADO' | 'INATIVO';
  projectId?: string;
  projectName?: string;
  notes?: string;
  guardianName?: string;
  guardianPhone?: string;
  isMinor?: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: 'Educação' | 'Saúde' | 'Assistência Social' | 'Eventos' | 'Administrativo' | 'Tecnologia' | 'Outros';
  skills: string[];
  availability: string; // Ex: "Sábados à tarde", "Segundas e Quartas"
  availableDays: ('Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sáb' | 'Dom')[];
  projectId?: string;
  projectName?: string;
  hoursWorked: number;
  status: 'ATIVO' | 'INATIVO';
  photoUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  type: 'Social' | 'Psicológico' | 'Entrega de Cesta' | 'Jurídico' | 'Médico' | 'Outro';
  responsibleName: string;
  notes: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  cpf?: string;
  ageGroup: 'Criança (0-12)' | 'Adolescente (13-17)' | 'Adulto (18-59)' | 'Idoso (60+)';
  birthDate: string;
  phone?: string;
  projectId: string;
  projectName: string;
  entryDate: string;
  status: 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'DESLIGADO';
  attendances: AttendanceRecord[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  responsibleName: string;
  beneficiariesCount: number;
  volunteersCount: number;
  eventsCount: number;
  totalExpenses: number;
  status: 'ATIVO' | 'EM_PLANEJAMENTO' | 'CONCLUIDO';
  startDate: string;
}

export interface EventInscription {
  id: string;
  participantName: string;
  participantPhone: string;
  inscriptionDate: string;
  status: 'CONFIRMADO' | 'PENDENTE' | 'CANCELADO';
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  responsibleName: string;
  category: 'Reunião' | 'Mutirão' | 'Acampamento' | 'Capacitação' | 'Culto/Celebração' | 'Outro';
  targetAudience: string;
  maxSlots: number;
  filledSlots: number;
  requiresRegistration: boolean;
  status: 'AGENDADO' | 'EM_ANDAMENTO' | 'REALIZADO' | 'CANCELADO';
  inscriptions?: EventInscription[];
}

export type RevenueCategory =
  | 'Doações'
  | 'Contribuições'
  | 'Patrocínios'
  | 'Convênios'
  | 'Eventos'
  | 'Outras receitas';

export type ExpenseCategory =
  | 'Aluguel'
  | 'Energia'
  | 'Água'
  | 'Internet'
  | 'Material de limpeza'
  | 'Material de escritório'
  | 'Alimentação'
  | 'Transporte'
  | 'Manutenção'
  | 'Equipamentos'
  | 'Projetos sociais'
  | 'Contabilidade'
  | 'Impostos/taxas'
  | 'Outras despesas';

export interface FinancialTransaction {
  id: string;
  type: 'RECEITA' | 'DESPESA';
  category: RevenueCategory | ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  paymentMethod: 'Pix' | 'Transferência' | 'Boleto' | 'Dinheiro' | 'Cartão';
  responsibleName: string;
  projectId?: string;
  projectName?: string;
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  attachmentUrl?: string;
  attachmentName?: string;
}
