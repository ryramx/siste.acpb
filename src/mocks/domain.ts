import { Member, Volunteer, Beneficiary, Project, EventItem, FinancialTransaction } from '../types/domain';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Projeto Reforço Escolar',
    description: 'Acompanhamento pedagógico e atividades educativas para crianças da comunidade Pau-Brasil.',
    responsibleName: 'Mariana Santos',
    beneficiariesCount: 74,
    volunteersCount: 12,
    eventsCount: 4,
    totalExpenses: 2850.00,
    status: 'ATIVO',
    startDate: '2024-02-01'
  },
  {
    id: 'proj-2',
    name: 'Projeto Cestas Básicas',
    description: 'Triagem e distribuição mensal de cestas de alimentos para famílias em vulnerabilidade extrema.',
    responsibleName: 'João da Silva',
    beneficiariesCount: 120,
    volunteersCount: 8,
    eventsCount: 2,
    totalExpenses: 5400.00,
    status: 'ATIVO',
    startDate: '2023-05-10'
  },
  {
    id: 'proj-3',
    name: 'Capacitação Profissional Digital',
    description: 'Cursos livres de informática básica e preparação para o mercado de trabalho.',
    responsibleName: 'Lucas Ferreira',
    beneficiariesCount: 24,
    volunteersCount: 5,
    eventsCount: 1,
    totalExpenses: 1200.00,
    status: 'EM_PLANEJAMENTO',
    startDate: '2026-10-01'
  }
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    name: 'João da Silva',
    cpf: '123.456.789-00',
    birthDate: '1985-06-15',
    phone: '(81) 99999-9999',
    whatsapp: '(81) 99999-9999',
    email: 'joao.silva@email.com',
    cep: '50000-000',
    address: 'Rua das Flores',
    number: '123',
    neighborhood: 'Boa Vista',
    city: 'Recife',
    state: 'PE',
    entryDate: '2022-01-15',
    status: 'ATIVO',
    projectId: 'proj-2',
    projectName: 'Projeto Cestas Básicas',
    notes: 'Membro ativo da equipe de logística do projeto de apoio alimentar.',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-2',
    name: 'Maria Silva',
    cpf: '987.654.321-11',
    birthDate: '1990-11-20',
    phone: '(81) 98888-8888',
    whatsapp: '(81) 98888-8888',
    email: 'maria.silva@email.com',
    cep: '50000-111',
    address: 'Av. Agamenon Magalhães',
    number: '450',
    complement: 'Apt 201',
    neighborhood: 'Espinheiro',
    city: 'Recife',
    state: 'PE',
    entryDate: '2023-03-10',
    status: 'ATIVO',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    notes: 'Pedagoga responsável pelas oficinas de leitura.',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-3',
    name: 'Carlos Souza',
    cpf: '456.789.123-22',
    birthDate: '1978-04-05',
    phone: '(81) 97777-7777',
    whatsapp: '(81) 97777-7777',
    email: 'carlos.souza@email.com',
    cep: '50000-222',
    address: 'Rua do Sol',
    number: '88',
    neighborhood: 'Santo Antônio',
    city: 'Recife',
    state: 'PE',
    entryDate: '2021-08-01',
    status: 'AFASTADO',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    notes: 'Afastado temporariamente por motivos de saúde familiar.',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-4',
    name: 'Ana Beatriz Souza',
    cpf: '111.222.333-44',
    birthDate: '2009-08-12',
    phone: '(81) 96666-5555',
    whatsapp: '(81) 96666-5555',
    email: 'ana.beatriz@email.com',
    cep: '50000-333',
    address: 'Rua da Aurora',
    number: '302',
    neighborhood: 'Santo Amaro',
    city: 'Recife',
    state: 'PE',
    entryDate: '2024-05-15',
    status: 'ATIVO',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    isMinor: true,
    guardianName: 'Márcia Souza',
    guardianPhone: '(81) 96666-0000',
    notes: 'Menor de idade cadastrada para monitoria jovem.',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  }
];

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-1',
    name: 'Ana Paula Rocha',
    email: 'ana.rocha@email.com',
    phone: '(81) 99111-2222',
    area: 'Educação',
    skills: ['Pedagogia', 'Reforço de Matemática', 'Contação de Histórias'],
    availability: 'Sábados à manhã',
    availableDays: ['Sáb'],
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    hoursWorked: 48,
    status: 'ATIVO',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'vol-2',
    name: 'Roberto Mendes',
    email: 'roberto.mendes@email.com',
    phone: '(81) 99222-3333',
    area: 'Assistência Social',
    skills: ['Logística', 'Motorista CNH B', 'Organização de Estoque'],
    availability: 'Segundas e Quartas (Tarde)',
    availableDays: ['Seg', 'Qua'],
    projectId: 'proj-2',
    projectName: 'Projeto Cestas Básicas',
    hoursWorked: 92,
    status: 'ATIVO',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'vol-3',
    name: 'Juliana Lima',
    email: 'juliana.lima@email.com',
    phone: '(81) 99333-4444',
    area: 'Saúde',
    skills: ['Atendimento Psicológico', 'Escuta Ativa', 'Apoio Emocional'],
    availability: 'Sextas-feiras o dia todo',
    availableDays: ['Sex'],
    hoursWorked: 36,
    status: 'ATIVO',
    photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80'
  }
];

export const MOCK_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Gabriel Santos Ferreira',
    cpf: '234.567.890-11',
    ageGroup: 'Criança (0-12)',
    birthDate: '2016-04-10',
    phone: '(81) 98123-4567',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    entryDate: '2024-03-01',
    status: 'EM_ATENDIMENTO',
    attendances: [
      {
        id: 'att-1',
        date: '2026-08-16',
        type: 'Social',
        responsibleName: 'Ana Paula Rocha',
        notes: 'Entrevista de acompanhamento escolar e entrega de kit de material.'
      },
      {
        id: 'att-2',
        date: '2026-08-09',
        type: 'Entrega de Cesta',
        responsibleName: 'João da Silva',
        notes: 'Entrega mensal de cesta básica para a família.'
      },
      {
        id: 'att-3',
        date: '2026-08-02',
        type: 'Psicológico',
        responsibleName: 'Juliana Lima',
        notes: 'Sessão inicial de acolhimento emocional infantil.'
      }
    ]
  },
  {
    id: 'ben-2',
    name: 'Dona Maria Francisca da Conceição',
    cpf: '345.678.901-22',
    ageGroup: 'Idoso (60+)',
    birthDate: '1952-09-18',
    phone: '(81) 98765-4321',
    projectId: 'proj-2',
    projectName: 'Projeto Cestas Básicas',
    entryDate: '2023-01-15',
    status: 'EM_ATENDIMENTO',
    attendances: [
      {
        id: 'att-4',
        date: '2026-08-10',
        type: 'Entrega de Cesta',
        responsibleName: 'Roberto Mendes',
        notes: 'Cesta básica entregue na residência devido à mobilidade reduzida.'
      }
    ]
  }
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'Reunião de voluntários',
    description: 'Alinhamento semestral das atividades sociais e escala dos projetos comunitários.',
    date: '2026-09-02',
    time: '19:00',
    location: 'Sede Principal ACPB - Sala Verde',
    responsibleName: 'Mariana Santos',
    category: 'Reunião',
    targetAudience: 'Todos os Voluntários',
    maxSlots: 40,
    filledSlots: 28,
    requiresRegistration: true,
    status: 'AGENDADO',
    inscriptions: [
      { id: 'ins-1', participantName: 'João da Silva', participantPhone: '(81) 99999-9999', inscriptionDate: '2026-08-25', status: 'CONFIRMADO' },
      { id: 'ins-2', participantName: 'Maria Silva', participantPhone: '(81) 98888-8888', inscriptionDate: '2026-08-26', status: 'CONFIRMADO' },
      { id: 'ins-3', participantName: 'Carlos Souza', participantPhone: '(81) 97777-7777', inscriptionDate: '2026-08-27', status: 'PENDENTE' }
    ]
  },
  {
    id: 'evt-2',
    title: 'Mutirão da Solidariedade',
    description: 'Arrecadação, triagem e montagem de cestas básicas para a comunidade Pau-Brasil.',
    date: '2026-09-08',
    time: '08:00',
    location: 'Galpão Comunitário',
    responsibleName: 'João da Silva',
    category: 'Mutirão',
    targetAudience: 'Comunidade e Voluntários',
    maxSlots: 60,
    filledSlots: 45,
    requiresRegistration: true,
    status: 'AGENDADO',
    inscriptions: []
  },
  {
    id: 'evt-3',
    title: 'Acampamento Pau-Brasil',
    description: 'Encontro anual de integração, retiro espiritual e planejamento estratégico da associação.',
    date: '2026-09-15',
    time: '08:00',
    location: 'Sítio Pau-Brasil - Aldeia',
    responsibleName: 'João da Silva',
    category: 'Acampamento',
    targetAudience: 'Membros e Voluntários',
    maxSlots: 50,
    filledSlots: 37,
    requiresRegistration: true,
    status: 'AGENDADO',
    inscriptions: [
      { id: 'ins-10', participantName: 'João da Silva', participantPhone: '(81) 99999-9999', inscriptionDate: '2026-08-01', status: 'CONFIRMADO' },
      { id: 'ins-11', participantName: 'Maria Silva', participantPhone: '(81) 98888-8888', inscriptionDate: '2026-08-02', status: 'CONFIRMADO' },
      { id: 'ins-12', participantName: 'Carlos Souza', participantPhone: '(81) 97777-7777', inscriptionDate: '2026-08-03', status: 'PENDENTE' }
    ]
  }
];

export const MOCK_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'fin-1',
    type: 'RECEITA',
    category: 'Doações',
    amount: 5200.00,
    date: '2026-08-05',
    description: 'Doação institucional Mantenedores Solidários',
    paymentMethod: 'Pix',
    responsibleName: 'Carlos Oliveira',
    status: 'PAGO'
  },
  {
    id: 'fin-2',
    type: 'RECEITA',
    category: 'Contribuições',
    amount: 3220.00,
    date: '2026-08-10',
    description: 'Contribuição mensal dos associados',
    paymentMethod: 'Transferência',
    responsibleName: 'Carlos Oliveira',
    status: 'PAGO'
  },
  {
    id: 'fin-3',
    type: 'DESPESA',
    category: 'Aluguel',
    amount: 1500.00,
    date: '2026-08-18',
    description: 'Aluguel da sede administrativa e social',
    paymentMethod: 'Boleto',
    responsibleName: 'Carlos Oliveira',
    status: 'PAGO',
    attachmentName: 'comprovante_aluguel_agosto.pdf',
    attachmentUrl: '#'
  },
  {
    id: 'fin-4',
    type: 'DESPESA',
    category: 'Energia',
    amount: 387.42,
    date: '2026-08-15',
    description: 'Fatura de energia elétrica da sede',
    paymentMethod: 'Pix',
    responsibleName: 'Carlos Oliveira',
    status: 'PAGO',
    attachmentName: 'conta_energia_agosto.pdf',
    attachmentUrl: '#'
  },
  {
    id: 'fin-5',
    type: 'DESPESA',
    category: 'Alimentação',
    amount: 850.00,
    date: '2026-08-20',
    description: 'Compra de suprimentos para o lanche das crianças do Reforço Escolar',
    paymentMethod: 'Pix',
    responsibleName: 'Mariana Santos',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    status: 'PENDENTE'
  }
];
