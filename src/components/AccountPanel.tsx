import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Copy, 
  AlertCircle, 
  FileText, 
  MapPin, 
  Phone, 
  Calendar,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  History,
  Target,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Company, UserProfile, Interaction, Ticket, Priority, Branch, Contact } from '../types';
import { getStrategy, getMission, calculateCompanyScore } from '../lib/missionEngine';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logAudit } from '../lib/auditService';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

interface AccountPanelProps {
  company: Company;
  profile: UserProfile;
  onClose: () => void;
}

export default function AccountPanel({ company, profile, onClose }: AccountPanelProps) {
  const [activeTab, setActiveTab] = useState<'strategy' | 'actions' | 'tickets' | 'details' | 'history'>('strategy');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactionText, setInteractionText] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editData, setEditData] = useState<Partial<Company>>({});
  const [newContact, setNewContact] = useState<Partial<Contact>>({ role: 'Purchasing', isPrimary: false });
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({ active: true });
  const [sellers, setSellers] = useState<{uid: string, name: string}[]>([]);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Mission and Strategy
  const strategy = getStrategy(company.segment);
  const mission = getMission(company);
  const { score, reason } = calculateCompanyScore(company);

  useEffect(() => {
    if (profile.role !== 'seller') {
      const fetchSellers = async () => {
        const q = query(collection(db, 'users'), where('active', '==', true));
        const snap = await getDocs(q);
        setSellers(snap.docs.map(d => ({ uid: d.id, name: d.data().name })));
      };
      fetchSellers();
    }
  }, [profile]);

  useEffect(() => {
    // Fetch interactions
    const qInter = query(
      collection(db, 'companies', company.id, 'interactions'),
      orderBy('createdAt', 'desc')
    );
    const unsubInter = onSnapshot(qInter, (snap) => {
      setInteractions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Interaction)));
    });

    // Fetch tickets
    const qTickets = query(
      collection(db, 'tickets'),
      where('companyId', '==', company.id),
      orderBy('createdAt', 'desc')
    );
    const unsubTickets = onSnapshot(qTickets, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
    });

    // Fetch branches
    const unsubBranches = onSnapshot(collection(db, 'companies', company.id, 'branches'), (snap) => {
      setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)));
    });

    // Fetch contacts
    const unsubContacts = onSnapshot(collection(db, 'companies', company.id, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
      setLoading(false);
    });

    return () => {
      unsubInter();
      unsubTickets();
      unsubBranches();
      unsubContacts();
    };
  }, [company.id]);

  const handleSaveInteraction = async () => {
    if (!interactionText.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'companies', company.id, 'interactions'), {
        userId: profile.uid,
        userName: profile.name,
        type: interactionType,
        description: interactionText,
        createdAt: serverTimestamp()
      });
      setInteractionText('');
      setActiveTab('history');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'interactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      const docRef = doc(db, 'companies', company.id);
      await updateDoc(docRef, { ...editData, updatedAt: serverTimestamp() });
      await logAudit(profile.uid, profile.name, 'company', company.id, 'Dados da conta atualizados');
      setIsEditingAccount(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name) return;
    try {
      await addDoc(collection(db, 'companies', company.id, 'contacts'), {
        ...newContact,
        createdAt: serverTimestamp()
      });
      setIsAddingContact(false);
      setNewContact({ role: 'Purchasing', isPrimary: false });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'contacts');
    }
  };

  const handleAddBranch = async () => {
    if (!newBranch.unitName) return;
    try {
      await addDoc(collection(db, 'companies', company.id, 'branches'), {
        ...newBranch,
        createdAt: serverTimestamp()
      });
      setIsAddingBranch(false);
      setNewBranch({ active: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'branches');
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const docRef = doc(db, 'companies', company.id);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'companies', company.id, 'interactions'), {
        userId: profile.uid,
        userName: profile.name,
        type: 'status_change',
        description: `Status alterado para: ${newStatus}`,
        createdAt: serverTimestamp()
      });

      await logAudit(
        profile.uid,
        profile.name,
        'company',
        company.id,
        `Status alterado: ${company.status} -> ${newStatus}`,
        { status: company.status },
        { status: newStatus }
      );

      // Handle win/commission logic
      if (newStatus === 'Fechado ganho') {
        const valueStr = prompt('Valor total da venda concluída (R$):');
        const saleValue = parseFloat(valueStr || '0');
        
        if (saleValue > 0) {
          const commissionAmount = (saleValue * (profile.commissionRateDefault || 0)) / 100;
          await addDoc(collection(db, 'commissions'), {
            userId: profile.uid,
            userName: profile.name,
            companyId: company.id,
            companyName: company.name,
            saleValue,
            commissionRate: profile.commissionRateDefault || 0,
            commissionAmount,
            status: 'pending',
            createdAt: serverTimestamp()
          });
          alert(`Venda registrada! Comissão calculada: R$ ${commissionAmount.toLocaleString('pt-BR')}`);
        }
      }

      setShowStatusMenu(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado com sucesso!');
  };

  const statusOptions = [
    'Novo cadastro', 'Pesquisar dados', 'Primeiro contato', 
    'Diagnóstico em andamento', 'Proposta enviada', 'Negociação', 
    'Fechado ganho', 'Fechado perdido'
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[600px] bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="p-6 bg-primary-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
           <div className="bg-white/10 p-2 rounded-lg">
              <Building2 size={24} className="text-gold" />
           </div>
           <div>
              <h2 className="font-bold text-lg leading-tight">{company.name}</h2>
              <p className="text-white/60 text-xs">{company.segment} • {company.address.city}, {company.address.state}</p>
           </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50 shrink-0 overflow-x-auto no-scrollbar">
        {[
          { id: 'strategy', label: 'Estratégia', icon: Target },
          { id: 'actions', label: 'Ações', icon: CheckCircle2 },
          { id: 'details', label: 'Dados', icon: ShieldCheck },
          { id: 'tickets', label: 'Tickets', icon: MessageSquare },
          { id: 'history', label: 'Histórico', icon: History },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap min-w-fit ${
              activeTab === t.id ? 'border-primary-900 text-primary-900 bg-white' : 'border-transparent text-technical hover:text-primary-800'
            }`}
          >
            <t.icon size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
        
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            {/* Missão */}
            <div className="bg-primary-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 0.1 }}
                 className="absolute -right-8 -bottom-8"
               >
                 <TrendingUp size={180} className="text-white" />
               </motion.div>
               
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-gold text-[10px] font-black uppercase tracking-[0.2em]">
                          <Zap size={14} /> Diretor Virtual
                       </div>
                       <h3 className="text-white font-black text-2xl tracking-tight">{mission.title}</h3>
                    </div>
                    <div className="flex flex-col items-center">
                       <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-lg ${
                         score > 75 ? 'border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' :
                         score > 40 ? 'border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' :
                         'border-red-400 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
                       }`}>
                          {score}
                       </div>
                       <span className="text-[8px] font-bold text-white/40 uppercase mt-2">Account Score</span>
                    </div>
                 </div>

                 <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium">
                   {mission.action}
                 </p>
                 
                 <div className="bg-white/5 rounded-xl p-3 border border-white/10 mb-6">
                    <p className="text-[9px] text-white/50 uppercase font-bold mb-1">Análise de IA</p>
                    <p className="text-[11px] text-gold/80 italic font-medium">{reason}</p>
                 </div>

                 <button 
                   onClick={async () => {
                     const { addDoc, serverTimestamp } = await import('firebase/firestore');
                     await addDoc(collection(db, 'companies', company.id, 'interactions'), {
                       userId: profile.uid,
                       userName: profile.name,
                       type: 'mission_completed',
                       description: `Missão concluída: ${mission.title}`,
                       createdAt: serverTimestamp()
                     });
                     alert('Missão concluída! Score da conta atualizado.');
                   }}
                   className="w-full py-4 bg-gold hover:bg-white text-primary-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-gold/20"
                 >
                   Concluir Missão
                 </button>
               </div>
            </div>

            {/* Pitch */}
            <div className="jrl-card p-6">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 italic">
                    <MessageSquare size={18} className="text-primary-800" /> Pitch de Vendas Sugerido
                  </h4>
                  <button onClick={() => copyToClipboard(strategy.pitch)} className="text-primary-800 hover:bg-primary-50 p-2 rounded-lg transition-all">
                    <Copy size={16} />
                  </button>
               </div>
               <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-slate-700 italic leading-relaxed">
                 "{strategy.pitch}"
               </div>
            </div>

            {/* WhatsApp */}
            <div className="jrl-card p-6 bg-emerald-50/30 border-emerald-100">
               <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                 <Send size={18} /> WhatsApp Inteligente
               </h4>
               <p className="text-sm text-emerald-900/70 mb-4 italic leading-relaxed">"{strategy.whatsapp}"</p>
               <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(strategy.whatsapp)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                    <Copy size={16} /> Copiar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 border border-emerald-600 text-emerald-600 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all">
                    WhatsApp Web
                  </button>
               </div>
            </div>

            {/* Produtos Prováveis */}
            <div className="jrl-card p-6">
               <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <FileText size={18} className="text-gold" /> Produtos Prováveis
               </h4>
               <div className="flex flex-wrap gap-2">
                  {strategy.products.map(p => (
                    <span key={p} className="bg-gray-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200">
                      {p}
                    </span>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Diagnóstico Guiado</h3>
            <div className="space-y-3">
              {['Fornecedor atual identificado', 'Volume mensal identificado', 'Embalagem identificada', 'Comprador correto identificado', 'Prazo validado', 'Segunda fonte identificada'].map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                  <input type="checkbox" className="w-5 h-5 accent-primary-900 rounded-md" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </label>
              ))}
            </div>
            
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-bold text-lg mb-4">Registrar Interação</h3>
              <div className="space-y-4">
                 <textarea className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 text-sm" placeholder="O que aconteceu no contato?"></textarea>
                 <div className="grid grid-cols-2 gap-4">
                    <select className="bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none">
                      <option>Tipo: Ligação</option>
                      <option>Tipo: WhatsApp</option>
                      <option>Tipo: E-mail</option>
                    </select>
                    <button className="jrl-btn-primary">Salvar Atividade</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-8 pb-20">
            {/* Fiscal & Address */}
            <div className="jrl-card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ShieldCheck size={20} className="text-primary-900" /> Ficha Cadastral Matriz
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-1">Razão Social</p>
                  <p className="text-sm font-medium text-slate-800">{company.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-1">CNPJ</p>
                  <p className="text-sm font-medium text-slate-800">{company.cnpj}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-1">I.E.</p>
                  <p className="text-sm font-medium text-slate-800">{company.stateRegistration || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-1">Cidade/UF</p>
                  <p className="text-sm font-medium text-slate-800">{company.address.city}, {company.address.state}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase font-bold text-technical mb-1">Endereço Completo</p>
                  <p className="text-sm font-medium text-slate-800">
                    {company.address.street}, {company.address.number} {company.address.complement && ` - ${company.address.complement}`}
                    <br />
                    {company.address.neighborhood} - CEP: {company.address.zip}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="jrl-card p-6 bg-slate-900 text-white">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <FileText size={20} className="text-gold" /> Comercial & Financeiro
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Condição de Pagamento</p>
                  <p className="text-sm font-medium text-gold">{company.paymentTerms || 'Padrão'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Limite de Crédito</p>
                  <p className="text-sm font-medium text-white">R$ {(company.creditLimit || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Frete Padrão</p>
                  <p className="text-sm font-medium text-white">{company.defaultFreightType || 'CIF'} - {company.preferredCarrier || 'Correios/Transportadora'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Vendedor Responsável</p>
                  <p className="text-sm font-medium text-white">{company.responsibleUserName}</p>
                </div>
              </div>
            </div>

            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-lg uppercase tracking-tighter text-primary-900">Unidades / Filiais</h3>
                <button className="jrl-btn-primary py-2 px-3 text-[10px]"><Plus size={14} /> Nova Filial</button>
              </div>
              {branches.length === 0 ? (
                <div className="jrl-card p-8 border-dashed border-2 flex flex-col items-center justify-center text-center opacity-40">
                  <Building2 size={32} className="mb-2" />
                  <p className="text-xs font-bold uppercase">Nenhuma filial vinculada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {branches.map(b => (
                    <div key={b.id} className="jrl-card p-4 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                         <h5 className="font-black text-primary-900 text-sm">{b.unitName}</h5>
                         <span className="text-[10px] font-bold text-technical">{b.cnpj}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2 italic">"{b.observations || 'Naluma observação registrada'}"</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                        <MapPin size={12} className="text-gold" /> {b.address}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-lg uppercase tracking-tighter text-primary-900">Contatos Chave</h3>
                <button className="jrl-btn-secondary py-2 px-3 text-[10px] text-primary-900 border-primary-900"><Plus size={14} /> Novo Contato</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contacts.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                         c.role === 'Purchasing' ? 'bg-indigo-100 text-indigo-700' :
                         c.role === 'Technical' ? 'bg-amber-100 text-amber-700' :
                         'bg-gray-100 text-gray-700'
                       }`}>
                         {c.role}
                       </span>
                       {c.isPrimary && <ShieldCheck size={14} className="text-emerald-500" />}
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm mb-1">{c.name}</h5>
                    <div className="space-y-1 mt-auto">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><FileText size={10} /> {c.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Orientações do Gestor</h3>
              {(profile.role === 'admin' || profile.role === 'manager') && (
                <button 
                  onClick={async () => {
                    const title = prompt('Título da Orientação:');
                    if (!title) return;
                    const desc = prompt('Descrição da Orientação:');
                    if (!desc) return;
                    
                    try {
                      await addDoc(collection(db, 'tickets'), {
                        companyId: company.id,
                        companyName: company.name,
                        managerId: profile.uid,
                        managerName: profile.name,
                        sellerId: company.responsibleUserId,
                        title,
                        description: desc,
                        status: 'novo',
                        priority: 'Alta',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                      });
                    } catch (err) {
                      handleFirestoreError(err, OperationType.WRITE, 'tickets');
                    }
                  }}
                  className="jrl-btn-primary py-2 text-xs"
                >
                  <Plus size={14} /> Nova Orientação
                </button>
              )}
            </div>
            
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma orientação registrada para esta conta.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map(t => (
                  <div key={t.id} className="jrl-card p-4 border-l-4 border-l-gold">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] uppercase font-bold text-gold">{t.priority}</span>
                       <span className="text-[10px] text-technical">{format(t.createdAt?.toDate() || new Date(), 'dd/MM/yy HH:mm')}</span>
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm mb-1">{t.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{t.description}</p>
                    <div className="flex items-center justify-between">
                       <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", t.status === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                         {t.status.replace('_', ' ')}
                       </span>
                       <button className="text-[10px] font-bold text-primary-900 hover:underline">Ver Detalhes</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
             <h3 className="font-bold text-lg">Timeline de Atividades</h3>
             <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {interactions.map((inter, i) => (
                  <div key={i} className="relative pl-12">
                    <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10">
                      <MessageSquare size={16} className="text-primary-800" />
                    </div>
                    <div className="jrl-card p-4">
                       <div className="flex justify-between items-start mb-1 text-xs">
                          <span className="font-bold text-primary-900">{inter.userName}</span>
                          <span className="text-technical">{format(inter.createdAt?.toDate() || new Date(), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</span>
                       </div>
                       <p className="text-sm text-slate-700 leading-relaxed">{inter.description}</p>
                       {inter.nextStep && (
                         <div className="mt-3 bg-gray-50 p-2 rounded-lg text-xs border border-gray-100">
                           <span className="font-bold text-gold uppercase text-[9px] block mb-1 tracking-wider">Próximo Passo</span>
                           {inter.nextStep}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

      </div>
      
      {/* Action Footer */}
      <div className="p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 shrink-0 relative">
          <button className="jrl-btn-secondary w-full py-4 text-xs font-bold uppercase tracking-widest"><FileText size={18} /> Proposta</button>
          
          <div className="relative">
            <button 
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="jrl-btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              Status: {company.status}
            </button>
            
            <AnimatePresence>
              {showStatusMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-technical uppercase tracking-widest text-center">Fase do Funil</p>
                  </div>
                  {statusOptions.map(opt => (
                    <button 
                      key={opt}
                      onClick={() => updateStatus(opt)}
                      className={`w-full px-4 py-3 text-left text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0 font-medium transition-colors ${
                        company.status === opt ? 'text-primary-900 bg-primary-50 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </div>
    </motion.div>
  );
}
