export type UserRole = 'admin' | 'manager' | 'seller';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  managerId?: string;
  active: boolean;
  mustChangePassword?: boolean;
  commissionRateDefault: number;
  createdAt: any;
}

export type CompanyStatus = 'Novo cadastro' | 'Pesquisar dados' | 'Primeiro contato' | 'Diagnóstico em andamento' | 'Diagnóstico completo' | 'Proposta em elaboração' | 'Proposta enviada' | 'Negociação' | 'Fechado ganho' | 'Fechado perdido' | 'Sem aderência';
export type Temperature = 'Gelo' | 'Frio' | 'Morno' | 'Quente' | 'Fogo';
export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Company {
  id: string;
  name: string;
  fantasyName: string;
  cnpj: string;
  ie?: string;
  im?: string;
  segment: string;
  status: CompanyStatus;
  temperature: Temperature;
  priority: Priority;
  potential: number;
  responsibleUserId: string;
  responsibleUserName?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  whatsapp?: string;
  email: string;
  site?: string;
  lastContactAt?: any;
  nextFollowupAt?: any;
  managerNotes?: string;
  score: number;
  createdAt: any;
  updatedAt: any;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  cnpj: string;
  address: any;
  createdAt: any;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  whatsapp?: string;
}

export interface Interaction {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  type: 'call' | 'whatsapp' | 'email' | 'proposal' | 'meeting' | 'note' | 'status_change';
  description: string;
  nextStep?: string;
  createdAt: any;
}

export interface ProposalItem {
  product: string;
  specification: string;
  price: number;
  currency: string;
  icms: number;
  pis: number;
  cofins: number;
  ipi: number;
  volume: number;
  unit: string;
  packaging: string;
}

export interface Proposal {
  id: string;
  companyId: string;
  branchId?: string;
  userId: string;
  userName: string;
  status: 'draft' | 'sent' | 'negotiation' | 'won' | 'lost' | 'cancelled';
  items: ProposalItem[];
  totalValue: number;
  freight: 'CIF' | 'FOB';
  deliveryPlace: string;
  deliveryTime: string;
  paymentCondition: string;
  validUntil: any;
  createdAt: any;
}

export interface Ticket {
  id: string;
  companyId: string;
  companyName: string;
  sellerId: string;
  managerId: string;
  managerName: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'novo' | 'em_andamento' | 'respondido' | 'concluido' | 'aprovado' | 'reaberto';
  dueDate: any;
  createdAt: any;
  updatedAt: any;
}

export interface Commission {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'ticket' | 'proposal' | 'followup' | 'system';
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: any;
}
