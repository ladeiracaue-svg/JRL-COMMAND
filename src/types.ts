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
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  segmentoIndustrial: string;
  statusComercial: CompanyStatus;
  temperaturaComercial: Temperature;
  prioridade: Priority;
  potencial: number;
  responsibleUserId: string;
  responsibleUserName: string;
  active: boolean;
  
  // Address
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;

  // Contact
  telefonePrincipal: string;
  whatsapp: string;
  emailPrincipal: string;
  site?: string;

  // Ficha Cadastral / Comercial
  condicaoPagamento?: string;
  limiteCredito?: number;
  transportadoraPreferencial?: string;
  tipoFretePadrao?: 'CIF' | 'FOB';
  compradorResponsavel?: string;
  financeiroResponsavel?: string;
  tecnicoResponsavel?: string;
  emailsAdicionais?: string;
  observacoesGerais?: string;
  observacoesInternas?: string;
  alertaGestor?: string;

  // Controle
  ultimoContato?: any;
  proximoFollowup?: any;
  origemCadastro?: string;
  dataUltimaAtualizacaoCadastral?: any;
  
  createdAt: any;
  updatedAt: any;
  score: number;
}

export interface Branch {
  id: string;
  companyId: string;
  nomeUnidade: string;
  cnpj: string;
  inscricaoEstadual?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone?: string;
  whatsapp?: string;
  compradorResponsavel?: string;
  emailCompras?: string;
  produtosConsumidos?: string[];
  observacoes?: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
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

export type ProposalStatus = 
  | 'Rascunho' 
  | 'Em elaboração' 
  | 'Enviada' 
  | 'Em negociação' 
  | 'Fechada ganha' 
  | 'Fechada perdida' 
  | 'Cancelada';

export interface ProposalItem {
  id: string;
  proposalId: string;
  productName: string;
  productFamily?: string;
  specification?: string;
  unitPrice: number;
  currency: 'BRL' | 'USD';
  volume: number;
  unit: string; // kg, L, ton, etc
  packageType: string;
  packageQty: number;
  taxesDescription?: string;
  icms?: number;
  pis?: number;
  cofins?: number;
  ipi?: number;
  otherTaxes?: number;
  freightType: 'CIF' | 'FOB' | 'Retirada';
  freightValue?: number;
  deliveryLocation?: string;
  deliveryTime?: string;
  paymentTerms?: string;
  itemObservations?: string;
  itemTotal: number;
}

export interface Proposal {
  id: string;
  number: string; // JRL-YYYY-XXXX
  companyId: string;
  companyName: string;
  branchId?: string;
  contactId?: string;
  userId: string;
  userName: string;
  date: any;
  validUntil: any;
  status: ProposalStatus;
  currency: 'BRL' | 'USD';
  totalProducts: number;
  totalTaxes: number;
  totalFreight: number;
  totalValue: number;
  paymentTerms: string;
  deliveryTime: string;
  observations?: string;
  internalObservations?: string;
  lossReason?: string;
  wonAt?: any;
  lostAt?: any;
  sentAt?: any;
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
