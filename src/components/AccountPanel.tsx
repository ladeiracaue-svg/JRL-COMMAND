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
  const [activeTab, setActiveTab] = useState<'strategy' | 'actions' | 'tickets' | 'details' | 'history' | 'branches'>('strategy');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactionText, setInteractionText] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Edit State
  const [editData, setEditData] = useState<Partial<Company>>({});
  const [branchData, setBranchData] = useState<Partial<Branch>>({ active: true });
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const [sellers, setSellers] = useState<{uid: string, name: string}[]>([]);
  
  // Mission and Strategy
  const strategy = getStrategy(company.segmentoIndustrial);
  const mission = getMission(company);
  const { score } = calculateCompanyScore(company);

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

    // Fetch audit logs
    const qLogs = query(
      collection(db, 'auditLogs'),
      where('entityId', '==', company.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
       setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubInter();
      unsubTickets();
      unsubBranches();
      unsubContacts();
      unsubLogs();
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
      
      // Portfolio Rotation Logic
      if (editData.responsibleUserId && editData.responsibleUserId !== company.responsibleUserId) {
        const reason = prompt('Motivo para a transferência de carteira:');
        const newSeller = sellers.find(s => s.uid === editData.responsibleUserId);
        
        await logAudit(
          profile.uid,
          profile.name,
          'company',
          company.id,
          'Rodízio de Carteira / Alteração de Vendedor',
          { sellerId: company.responsibleUserId, sellerName: company.responsibleUserName },
          { sellerId: editData.responsibleUserId, sellerName: newSeller?.name, reason }
        );

        // Notify new seller (via interactions as a proxy for now)
        await addDoc(collection(db, 'companies', company.id, 'interactions'), {
          userId: profile.uid,
          userName: profile.name,
          type: 'note',
          description: `CARTEIRA ALTERADA: De ${company.responsibleUserName} para ${newSeller?.name}. Motivo: ${reason || 'Não informado'}`,
          createdAt: serverTimestamp()
        });
      } else {
        await logAudit(profile.uid, profile.name, 'company', company.id, 'Atualização de ficha cadastral');
      }

      await updateDoc(docRef, { ...editData, updatedAt: serverTimestamp() });
      setIsEditingAccount(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const toggleCompanyActive = async () => {
    if (!confirm(`Deseja realmente ${company.active ? 'inativar' : 'ativar'} esta empresa?`)) return;
    try {
      const docRef = doc(db, 'companies', company.id);
      await updateDoc(docRef, { active: !company.active, updatedAt: serverTimestamp() });
      await logAudit(profile.uid, profile.name, 'company', company.id, company.active ? 'Empresa Inativada' : 'Empresa Reativada');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const handleSaveBranch = async () => {
    try {
      const { setDoc, doc, addDoc } = await import('firebase/firestore');
      if (activeBranchId) {
        await setDoc(doc(db, 'companies', company.id, 'branches', activeBranchId), {
           ...branchData,
           updatedAt: serverTimestamp()
        }, { merge: true });
        await logAudit(profile.uid, profile.name, 'branch', activeBranchId, 'Filial Atualizada');
      } else {
        const branchRef = await addDoc(collection(db, 'companies', company.id, 'branches'), {
           ...branchData,
           companyId: company.id,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
        });
        await logAudit(profile.uid, profile.name, 'branch', branchRef.id, 'Filial Criada');
      }
      setIsEditingBranch(false);
      setBranchData({ active: true });
      setActiveBranchId(null);
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
          { id: 'strategy', label: 'IA', icon: Target },
          { id: 'details', label: 'Ficha', icon: ShieldCheck },
          { id: 'branches', label: 'Filiais', icon: Building2 },
          { id: 'actions', label: 'Ações', icon: CheckCircle2 },
          { id: 'tickets', label: 'Gestor', icon: MessageSquare },
          { id: 'history', label: 'Log', icon: History },
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
            {/* Action Header */}
            <div className="flex items-center justify-between">
               <h3 className="font-black text-xl uppercase tracking-tighter text-primary-900">Ficha Cadastral</h3>
               <div className="flex gap-2">
                  {(profile.role === 'admin' || profile.role === 'manager') && (
                    <button 
                      onClick={toggleCompanyActive}
                      className={cn(
                        "p-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        company.active ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}
                    >
                      {company.active ? 'Inativar' : 'Reativar'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setEditData(company);
                      setIsEditingAccount(true);
                    }}
                    className="p-2 px-4 bg-primary-900 text-gold rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-gold/20 transition-all"
                  >
                    Editar Ficha
                  </button>
               </div>
            </div>

            {/* Fiscal & Address */}
            <div className="jrl-card p-6 border-l-4 border-l-primary-900">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ShieldCheck size={20} className="text-primary-900" /> Identidade & Localização
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">Razão Social</p>
                  <p className="text-sm font-black text-primary-900">{company.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">Nome Fantasia</p>
                  <p className="text-sm font-bold text-slate-800">{company.nomeFantasia || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">CNPJ</p>
                  <p className="text-sm font-bold text-slate-800">{company.cnpj}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">I.E.</p>
                  <p className="text-sm font-bold text-slate-800">{company.inscricaoEstadual || '--'}</p>
                </div>
                <div className="col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-technical mb-2 opacity-60 tracking-wider">Endereço Principal</p>
                  <div className="flex items-start gap-3">
                     <MapPin size={18} className="text-gold shrink-0 mt-1" />
                     <div>
                        <p className="text-xs font-bold text-slate-900">{company.endereco}, {company.numero} {company.complemento && ` - ${company.complemento}`}</p>
                        <p className="text-[11px] text-technical">{company.bairro} - {company.cidade} / {company.uf} - CEP: {company.cep}</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="jrl-card p-6">
               <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Phone size={20} className="text-primary-900" /> Contato Direto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">Telefone Principal</p>
                   <p className="text-sm font-bold text-slate-800">{company.telefonePrincipal}</p>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">WhatsApp Comercial</p>
                   <p className="text-sm font-bold text-emerald-600">{company.whatsapp || '--'}</p>
                 </div>
                 <div className="col-span-2">
                   <p className="text-[10px] uppercase font-bold text-technical mb-0.5 opacity-60 tracking-wider">E-mail Corporativo</p>
                   <p className="text-sm font-bold text-slate-800 break-all">{company.emailPrincipal}</p>
                 </div>
              </div>
            </div>

            {/* Commercial Info */}
            <div className="jrl-card p-6 bg-primary-900 text-white rounded-3xl shadow-xl">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <FileText size={20} className="text-gold" /> Estrutura Comercial
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Condição de Pagto</p>
                  <p className="text-sm font-black text-gold">{company.condicaoPagamento || 'Padrão'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Limite de Crédito</p>
                  <p className="text-sm font-black text-white">R$ {(company.limiteCredito || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Frete Padrão</p>
                  <p className="text-sm font-bold text-white">{company.tipoFretePadrao || 'CIF'} - {company.transportadoraPreferencial || 'Transportadora'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Responsável Atual</p>
                  <p className="text-sm font-black text-white flex items-center gap-2">
                     <Target size={14} className="text-gold" />
                     {company.responsibleUserName}
                  </p>
                </div>
                <div className="col-span-2 border-t border-white/10 pt-4">
                  <p className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Representantes do Cliente</p>
                  <div className="text-[11px] grid grid-cols-3 gap-2">
                     <div>
                        <span className="block opacity-50">Comprador</span>
                        <span className="font-bold">{company.compradorResponsavel || '--'}</span>
                     </div>
                     <div>
                        <span className="block opacity-50">Financeiro</span>
                        <span className="font-bold">{company.financeiroResponsavel || '--'}</span>
                     </div>
                     <div>
                        <span className="block opacity-50">Técnico</span>
                        <span className="font-bold">{company.tecnicoResponsavel || '--'}</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Management Notes */}
            <div className="space-y-4">
               {company.alertaGestor && (
                 <div className="p-4 bg-red-50 border-2 border-red-500/20 rounded-2xl flex gap-3 items-start shadow-sm">
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[10px] font-black uppercase text-red-700 tracking-widest mb-1">ALERTA ESTRATÉGICO</p>
                       <p className="text-xs font-bold text-red-900 leading-relaxed">{company.alertaGestor}</p>
                    </div>
                 </div>
               )}
               <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                  <h5 className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-3">Observações Internas</h5>
                  <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-wrap">{company.observacoesInternas || 'Nenhuma observação interna disponível.'}</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
           <div className="space-y-6 pb-20">
              <div className="flex items-center justify-between">
                 <h3 className="font-black text-xl uppercase tracking-tighter text-primary-900">Unidades de Negócio</h3>
                 <button 
                  onClick={() => {
                    setBranchData({ active: true });
                    setActiveBranchId(null);
                    setIsEditingBranch(true);
                  }}
                  className="jrl-btn-primary py-2 px-4 shadow-lg"
                 >
                   <Plus size={16} /> Nova Filial
                 </button>
              </div>

              {branches.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center px-8">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Building2 size={32} className="text-gray-300" />
                   </div>
                   <h4 className="font-black text-gray-400 uppercase text-xs tracking-widest">Nenhuma unidade vinculada</h4>
                   <p className="text-[11px] text-technical mt-2">Cadastre filiais para mapear o consumo em diferentes regiões.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                   {branches.map(b => (
                     <motion.div 
                        key={b.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "jrl-card p-5 group hover:shadow-xl transition-all border-l-4",
                          b.active ? "border-l-emerald-500" : "border-l-gray-300 opacity-60"
                        )}
                     >
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h5 className="font-black text-primary-900 text-base">{b.nomeUnidade}</h5>
                              <p className="text-[10px] font-bold text-technical uppercase opacity-60">CNPJ: {b.cnpj}</p>
                           </div>
                           <button 
                              onClick={() => {
                                setBranchData(b);
                                setActiveBranchId(b.id);
                                setIsEditingBranch(true);
                              }}
                              className="p-2 text-primary-900 hover:bg-primary-50 rounded-lg transition-all"
                           >
                              Editar
                           </button>
                        </div>
                        <div className="space-y-2 mb-4">
                           <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                             <MapPin size={14} className="text-gold" />
                             {b.cidade} - {b.uf}
                           </div>
                           <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                             <Target size={14} className="text-gold" />
                             Resp: {b.compradorResponsavel || '--'}
                           </div>
                        </div>
                        <p className="text-[11px] text-slate-500 italic bg-gray-50 p-2 rounded-lg leading-relaxed">
                           "{b.observacoes || 'Sem observações registradas.'}"
                        </p>
                     </motion.div>
                   ))}
                </div>
              )}
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
          <div className="space-y-8 pb-20">
             <div>
                <h3 className="font-black text-xl uppercase tracking-tighter text-primary-900 mb-6">Auditoria & Logs</h3>
                <div className="space-y-4">
                   {auditLogs.length === 0 ? (
                      <div className="text-center py-10 opacity-30">
                        <History size={48} className="mx-auto mb-2" />
                        <p className="text-xs font-black uppercase">Nenhum log estratégico</p>
                      </div>
                   ) : (
                      auditLogs.map(log => (
                        <div key={log.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[9px] font-black uppercase text-gold leading-none tracking-widest">{log.action}</span>
                              <span className="text-[9px] font-bold text-technical">{format(log.createdAt?.toDate() || new Date(), 'dd/MM/yy HH:mm')}</span>
                           </div>
                           <p className="text-xs font-bold text-slate-900 mb-2">{log.userName}</p>
                           {log.newValue?.reason && (
                             <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg text-[10px] text-orange-800 font-medium">
                                Motivo: {log.newValue.reason}
                             </div>
                           )}
                        </div>
                      ))
                   )}
                </div>
             </div>

             <div className="border-t border-gray-100 pt-8">
                <h3 className="font-black text-xl uppercase tracking-tighter text-primary-900 mb-6">Linha do Tempo</h3>
                <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                  {interactions.map((inter, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10">
                        <MessageSquare size={16} className={cn(inter.type === 'mission_completed' ? 'text-emerald-500' : 'text-primary-800')} />
                      </div>
                      <div className="jrl-card p-4">
                        <div className="flex justify-between items-start mb-1 text-xs">
                            <span className="font-bold text-primary-900">{inter.userName}</span>
                            <span className="text-technical">{format(inter.createdAt?.toDate() || new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        <p className={cn("text-xs leading-relaxed", inter.type === 'mission_completed' ? 'font-bold text-emerald-700 italic' : 'text-slate-700')}>
                          {inter.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
      {/* Modals for Editing and Adding */}
      <AnimatePresence>
         {isEditingAccount && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingAccount(false)} className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-primary-900 uppercase tracking-tighter">Editar Ficha Estratégica</h3>
                    <button onClick={() => setIsEditingAccount(false)}><X size={20} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* SECTION A: DADOS DA EMPRESA */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-primary-900 border-b pb-1 tracking-widest">Identidade</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                             <label className="text-[10px] font-black uppercase text-technical">Razão Social</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.razaoSocial} onChange={(e) => setEditData({...editData, razaoSocial: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Nome Fantasia</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.nomeFantasia} onChange={(e) => setEditData({...editData, nomeFantasia: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Segmento</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.segmentoIndustrial} onChange={(e) => setEditData({...editData, segmentoIndustrial: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Status</label>
                             <select className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={editData.statusComercial} onChange={(e) => setEditData({...editData, statusComercial: e.target.value as any})}>
                                {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Vendedor Responsável</label>
                             <select 
                               disabled={profile.role === 'seller'}
                               className="w-full p-3 bg-gray-50 rounded-xl disabled:opacity-50 font-bold" 
                               value={editData.responsibleUserId} 
                               onChange={(e) => {
                                  const s = sellers.find(x => x.uid === e.target.value);
                                  setEditData({...editData, responsibleUserId: e.target.value, responsibleUserName: s?.name || ''});
                               }}
                             >
                                {sellers.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* SECTION B: LOCALIZAÇÃO & CONTATO */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-primary-900 border-b pb-1 tracking-widest">Localização & Contato</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                             <label className="text-[10px] font-black uppercase text-technical">Endereço</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.endereco} onChange={(e) => setEditData({...editData, endereco: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Cidade</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.cidade} onChange={(e) => setEditData({...editData, cidade: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">UF</label>
                             <input type="text" maxLength={2} className="w-full p-3 bg-gray-50 rounded-xl" value={editData.uf} onChange={(e) => setEditData({...editData, uf: e.target.value.toUpperCase()})} />
                          </div>
                          <div className="col-span-2 grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black uppercase text-technical">Telefone Principal</label>
                                <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.telefonePrincipal} onChange={(e) => setEditData({...editData, telefonePrincipal: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-[10px] font-black uppercase text-technical">E-mail Principal</label>
                                <input type="email" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.emailPrincipal} onChange={(e) => setEditData({...editData, emailPrincipal: e.target.value})} />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* SECTION C: COMERCIAL */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-primary-900 border-b pb-1 tracking-widest">Comercial & Financeiro</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Cond. Pagamento</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.condicaoPagamento} onChange={(e) => setEditData({...editData, condicaoPagamento: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Limite Crédito</label>
                             <input type="number" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.limiteCredito} onChange={(e) => setEditData({...editData, limiteCredito: Number(e.target.value)})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Transportadora</label>
                             <input type="text" className="w-full p-3 bg-gray-50 rounded-xl" value={editData.transportadoraPreferencial} onChange={(e) => setEditData({...editData, transportadoraPreferencial: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase text-technical">Frete Padrão</label>
                             <select className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={editData.tipoFretePadrao} onChange={(e) => setEditData({...editData, tipoFretePadrao: e.target.value as any})}>
                                <option value="CIF">CIF</option>
                                <option value="FOB">FOB</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* SECTION D: GESTÃO */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-primary-900 border-b pb-1 tracking-widest text-red-600 border-red-100">Gestão & Auditoria</h4>
                       <div>
                          <label className="text-[10px] font-black uppercase text-red-700">Alerta do Gestor</label>
                          <input 
                              disabled={profile.role === 'seller'}
                              type="text" 
                              className="w-full p-3 bg-red-50 rounded-xl font-bold border border-red-100" 
                              value={editData.alertaGestor} 
                              onChange={(e) => setEditData({...editData, alertaGestor: e.target.value})} 
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-technical">Observações Internas (Somente Gestores)</label>
                          <textarea 
                             disabled={profile.role === 'seller'}
                             rows={4} 
                             className="w-full p-3 bg-gray-100 rounded-xl disabled:opacity-50" 
                             value={editData.observacoesInternas} 
                             onChange={(e) => setEditData({...editData, observacoesInternas: e.target.value})} 
                          />
                       </div>
                    </div>
                 </div>
                 <div className="p-6 border-t border-gray-100 flex gap-2">
                    <button onClick={() => setIsEditingAccount(false)} className="flex-1 py-3 border border-gray-100 rounded-xl font-bold">Cancelar</button>
                    <button onClick={handleSaveAccount} className="flex-1 py-3 bg-primary-900 text-gold rounded-xl font-black uppercase tracking-widest">Salvar Alterações</button>
                 </div>
              </motion.div>
           </div>
         )}

         {isEditingBranch && (
            <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingBranch(false)} className="absolute inset-0 bg-primary-900/60" />
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl w-full max-w-xl shadow-2xl p-8 space-y-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-black text-lg uppercase">Configurar Filial / Unidade</h3>
                     <button onClick={() => setIsEditingBranch(false)}><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase opacity-60">Nome da Unidade *</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl" value={branchData.nomeUnidade} onChange={(e) => setBranchData({...branchData, nomeUnidade: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase opacity-60">CNPJ Filial</label>
                        <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl" value={branchData.cnpj} onChange={(e) => setBranchData({...branchData, cnpj: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase opacity-60">Cidade / UF</label>
                        <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl" value={branchData.cidade} onChange={(e) => setBranchData({...branchData, cidade: e.target.value, uf: branchData.uf})} />
                     </div>
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase opacity-60">Observações de Filial</label>
                        <textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl" value={branchData.observacoes} onChange={(e) => setBranchData({...branchData, observacoes: e.target.value})} />
                     </div>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={branchData.active} onChange={(e) => setBranchData({...branchData, active: e.target.checked})} />
                        <span className="text-xs font-bold uppercase">Filial Ativa</span>
                     </label>
                  </div>
                  <div className="flex gap-2 pt-4">
                     <button onClick={() => setIsEditingBranch(false)} className="flex-1 py-3 border border-gray-100 rounded-xl">Cancelar</button>
                     <button onClick={handleSaveBranch} className="flex-1 py-3 bg-primary-900 text-gold rounded-xl font-black uppercase tracking-widest shadow-xl">Salvar Unidade</button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}
