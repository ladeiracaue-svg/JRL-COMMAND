export type UserRole = 'admin' | 'manager' | 'seller';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  managerId?: string;
  active: boolean;
  commissionRateDefault: number;
  commissionEnabled: boolean;
  createdAt: any;
}

export type CompanyStatus = 
  | 'Novo cadastro' 
  | 'Pesquisar dados' 
  | 'Primeiro contato' 
  | 'Diagnóstico em andamento' 
  | 'Diagnóstico completo' 
  | 'Proposta em elaboração' 
  | 'Proposta enviada' 
  | 'Negociação' 
  | 'Fechado ganho' 
  | 'Fechado perdido' 
  | 'Sem aderência';

export type Temperature = 'Frio' | 'Morno' | 'Quente' | 'Urgente';
export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Company {
  id: string;
  name: string;
  fantasyName?: string;
  cnpj: string;
  stateRegistration?: string;
  cityRegistration?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  segment: string;
  responsibleUserId: string;
  responsibleUserName: string;
  status: CompanyStatus;
  temperature: Temperature;
  priority: Priority;
  score: number;
  potential: number;
  observations?: string;
  managerNotes?: string;
  
  // Financial/Credit
  paymentTerms?: string;
  creditLimit?: number;
  preferredCarrier?: string;
  defaultFreightType?: 'CIF' | 'FOB';
  
  createdAt: any;
  updatedAt: any;
  lastContactAt?: any;
  nextFollowupAt?: any;
}

export interface Branch {
  id: string;
  companyId: string;
  unitName: string;
  cnpj: string;
  stateRegistration?: string;
  address: string;
  phone: string;
  responsibleBuyer: string;
  consumedProducts: string[];
  observations?: string;
  active: boolean;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  role: 'Purchasing' | 'Finance' | 'Technical' | 'Owner' | 'Other';
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Interaction {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  type: 'call' | 'whatsapp' | 'email' | 'proposal' | 'meeting' | 'note' | 'status_change' | 'mission_completed';
  description: string;
  createdAt: any;
}

export interface ProposalItem {
  id: string;
  product: string;
  specification?: string;
  unitPrice: number;
  currency: 'BRL' | 'USD';
  quantity: number;
  unit: string; // kg, L, ton, etc
  packaging: string;
  qtyPerPackage: number;
  taxes: {
    icms: number;
    pisCofins: number;
    ipi: number;
    other: number;
  };
}

export interface Proposal {
  id: string;
  companyId: string;
  branchId?: string;
  userId: string;
  userName: string;
  date: any;
  validUntil: any;
  status: 'draft' | 'sent' | 'won' | 'lost' | 'canceled';
  totalValue: number;
  items: ProposalItem[];
  paymentTerms: string;
  freightType: 'CIF' | 'FOB';
  deliveryLocation: string;
  deliveryTime: string;
  observations?: string;
  createdAt: any;
  updatedAt: any;
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
  dueDate?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Commission {
  id: string;
  proposalId: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  saleValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'canceled';
  approvedBy?: string;
  paidAt?: any;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  entityType: 'company' | 'proposal' | 'branch' | 'user';
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  createdAt: any;
}
