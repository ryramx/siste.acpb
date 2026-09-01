import { Member, Volunteer, Beneficiary, Project, EventItem, FinancialTransaction, AttendanceRecord } from '../types/domain';
import { MOCK_MEMBERS, MOCK_VOLUNTEERS, MOCK_BENEFICIARIES, MOCK_PROJECTS, MOCK_EVENTS, MOCK_FINANCIAL_TRANSACTIONS } from '../mocks/domain';

// Estado em memória persistente durante a sessão do browser
let membersList = [...MOCK_MEMBERS];
let volunteersList = [...MOCK_VOLUNTEERS];
let beneficiariesList = [...MOCK_BENEFICIARIES];
let projectsList = [...MOCK_PROJECTS];
let eventsList = [...MOCK_EVENTS];
let financialList = [...MOCK_FINANCIAL_TRANSACTIONS];

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const memberService = {
  async getAll(): Promise<Member[]> {
    await delay();
    return [...membersList];
  },
  async getById(id: string): Promise<Member | undefined> {
    await delay();
    return membersList.find((m) => m.id === id);
  },
  async create(data: Omit<Member, 'id'>): Promise<Member> {
    await delay();
    const newMember: Member = { ...data, id: `mem-${Date.now()}` };
    membersList.unshift(newMember);
    return newMember;
  },
  async update(id: string, data: Partial<Member>): Promise<Member> {
    await delay();
    const index = membersList.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Membro não encontrado');
    membersList[index] = { ...membersList[index], ...data };
    return membersList[index];
  },
  async delete(id: string): Promise<void> {
    await delay();
    membersList = membersList.filter((m) => m.id !== id);
  }
};

export const volunteerService = {
  async getAll(): Promise<Volunteer[]> {
    await delay();
    return [...volunteersList];
  },
  async getById(id: string): Promise<Volunteer | undefined> {
    await delay();
    return volunteersList.find((v) => v.id === id);
  }
};

export const beneficiaryService = {
  async getAll(): Promise<Beneficiary[]> {
    await delay();
    return [...beneficiariesList];
  },
  async getById(id: string): Promise<Beneficiary | undefined> {
    await delay();
    return beneficiariesList.find((b) => b.id === id);
  },
  async addAttendance(beneficiaryId: string, attendance: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    await delay();
    const beneficiary = beneficiariesList.find((b) => b.id === beneficiaryId);
    if (!beneficiary) throw new Error('Beneficiário não encontrado');
    const newRecord: AttendanceRecord = { ...attendance, id: `att-${Date.now()}` };
    beneficiary.attendances.unshift(newRecord);
    return newRecord;
  }
};

export const projectService = {
  async getAll(): Promise<Project[]> {
    await delay();
    return [...projectsList];
  },
  async getById(id: string): Promise<Project | undefined> {
    await delay();
    return projectsList.find((p) => p.id === id);
  },
  async create(data: Omit<Project, 'id' | 'beneficiariesCount' | 'volunteersCount' | 'eventsCount' | 'totalExpenses'>): Promise<Project> {
    await delay();
    const newProject: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      beneficiariesCount: 0,
      volunteersCount: 0,
      eventsCount: 0,
      totalExpenses: 0
    };
    projectsList.unshift(newProject);
    return newProject;
  }
};

export const eventService = {
  async getAll(): Promise<EventItem[]> {
    await delay();
    return [...eventsList];
  },
  async getById(id: string): Promise<EventItem | undefined> {
    await delay();
    return eventsList.find((e) => e.id === id);
  },
  async create(data: Omit<EventItem, 'id' | 'filledSlots' | 'inscriptions'>): Promise<EventItem> {
    await delay();
    const newEvent: EventItem = {
      ...data,
      id: `evt-${Date.now()}`,
      filledSlots: 0,
      inscriptions: []
    };
    eventsList.unshift(newEvent);
    return newEvent;
  }
};

export const financialService = {
  async getAll(): Promise<FinancialTransaction[]> {
    await delay();
    return [...financialList];
  },
  async create(data: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> {
    await delay();
    const newTx: FinancialTransaction = { ...data, id: `fin-${Date.now()}` };
    financialList.unshift(newTx);
    return newTx;
  }
};
