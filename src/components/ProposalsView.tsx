import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Download, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Printer,
  Building2
} from 'lucide-react';
import { Proposal, UserProfile, Company, Branch, ProposalItem } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { logAudit } from '../lib/auditService';
import { getBaseQuery } from '../lib/permissions';
import { useTeam } from '../lib/useTeam';

interface ProposalsViewProps {
  profile: UserProfile;
}

export default function ProposalsView({ profile }: ProposalsViewProps) {
  const { teamIds, loading: loadingTeam } = useTeam(profile);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [items, setItems] = useState<Partial<ProposalItem>[]>([
    { product: '', packaging: 'Saco 25kg', quantity: 1000, unitPrice: 0, unit: 'kg' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch companies for selection
    let qComp = query(collection(db, 'companies'), orderBy('name', 'asc'));
    if (profile.role === 'seller') {
       qComp = query(collection(db, 'companies'), where('responsibleUserId', '==', profile.uid), orderBy('name', 'asc'));
    }
    const unsub = onSnapshot(qComp, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    });
    return unsub;
  }, [profile]);

  const addItem = () => {
    setItems([...items, { product: '', packaging: 'Saco 25kg', quantity: 1000, unitPrice: 0, unit: 'kg' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  };

  const handleSaveProposal = async () => {
    if (!selectedCompany) return;
    setIsSubmitting(true);
    try {
      const total = calculateTotal();
      const proposalData = {
        userId: profile.uid,
        userName: profile.name,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        branchId: selectedCompany.id, // Default to main for now
        date: serverTimestamp(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        items: items,
        totalValue: total,
        status: 'sent',
        observations: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'proposals'), proposalData);
      
      // Log interaction
      await addDoc(collection(db, 'companies', selectedCompany.id, 'interactions'), {
        userId: profile.uid,
        userName: profile.name,
        type: 'status_change',
        description: `Proposta enviada no valor de R$ ${total.toLocaleString('pt-BR')}`,
        createdAt: serverTimestamp()
      });

      await logAudit(
        profile.uid,
        profile.name,
        'proposal',
        docRef.id,
        `Proposta gerada para ${selectedCompany.name}`,
        null,
        proposalData
      );

      setIsModalOpen(false);
      setStep(1);
      setSelectedCompany(null);
      setItems([{ product: '', packaging: 'Saco 25kg', volume: 1000, price: 0, unit: 'kg' }]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proposals');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (loadingTeam) return;
    const q = getBaseQuery(collection(db, 'proposals'), profile, teamIds);

    const unsub = onSnapshot(q, (snap) => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'proposals');
      setLoading(false);
    });

    return unsub;
  }, [profile, teamIds, loadingTeam]);

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 tracking-tighter uppercase">Propostas Comerciais</h2>
          <p className="text-technical text-xs font-medium">Gestão de orçamentos e negociações ativas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="jrl-btn-primary"
        >
          <Plus size={18} /> Nova Proposta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-technical" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, vendedor ou número..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-900 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-technical" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-xs uppercase"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos Status</option>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviada</option>
            <option value="won">Ganhou</option>
            <option value="lost">Perdeu</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest text-center">Nº</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Vendedor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Valor Total</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-technical tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-xs font-bold text-center text-primary-900/50">#{p.id.slice(0, 5).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary-900">Empresa Chave</p>
                    <p className="text-[10px] text-technical">Ref: {format(p.date?.toDate() || new Date(), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-700">{p.userName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-primary-900">R$ {p.totalValue.toLocaleString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                      p.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'lost' ? 'bg-red-100 text-red-700' :
                      p.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 hover:bg-primary-50 text-primary-800 rounded-lg transition-all"><Printer size={16} /></button>
                       <button className="p-2 hover:bg-primary-50 text-primary-800 rounded-lg transition-all"><ChevronRight size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProposals.length === 0 && (
            <div className="py-20 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="text-technical font-medium">Nenhuma proposta encontrada.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Modal Nova Proposta - Placeholder for now */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-primary-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
               <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="bg-primary-900 text-gold p-2 rounded-xl">
                        <Plus size={20} />
                     </div>
                     <h3 className="text-xl font-black text-primary-900 uppercase tracking-tighter">Gerar Orçamento Técnico</h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                     <ChevronRight className="rotate-180" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8">
                  {step === 1 ? (
                    <div className="space-y-6">
                       <h4 className="font-bold text-slate-900 border-b pb-2 uppercase text-xs tracking-widest text-primary-900">1. Selecione o Cliente</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {companies.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => {
                                setSelectedCompany(c);
                                setStep(2);
                              }}
                              className="p-4 bg-white border border-gray-100 rounded-2xl text-left hover:border-primary-900 hover:shadow-xl transition-all group"
                            >
                               <div className="flex items-center gap-3 mb-2">
                                  <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-primary-900 group-hover:text-gold transition-colors">
                                     <Building2 size={18} />
                                  </div>
                                  <span className="font-bold text-primary-900 text-sm">{c.name}</span>
                               </div>
                               <p className="text-[10px] text-technical font-medium">CNPJ: {c.cnpj} • {c.address.city}/{c.address.state}</p>
                            </button>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="flex items-center justify-between border-b pb-4">
                          <div className="flex items-center gap-3">
                             <div className="bg-primary-900 text-gold p-2 rounded-lg">
                                <Building2 size={18} />
                             </div>
                             <div>
                                <h4 className="font-black text-primary-900 uppercase tracking-tighter">{selectedCompany?.name}</h4>
                                <p className="text-[10px] text-technical font-bold uppercase tracking-widest">Itens do Orçamento</p>
                             </div>
                          </div>
                          <button onClick={() => setStep(1)} className="text-xs font-bold text-primary-900 hover:underline">Trocar Cliente</button>
                       </div>

                       <div className="space-y-4">
                          {items.map((item, idx) => (
                             <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row gap-4 relative group">
                                <div className="flex-1">
                                   <label className="block text-[10px] uppercase font-black text-technical mb-1 tracking-wider">Produto</label>
                                   <input 
                                     placeholder="Nome do produto..."
                                     className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-primary-900"
                                     value={item.product}
                                     onChange={(e) => updateItem(idx, 'product', e.target.value)}
                                   />
                                </div>
                                <div className="w-full md:w-32">
                                   <label className="block text-[10px] uppercase font-black text-technical mb-1 tracking-wider">Emb.</label>
                                   <select 
                                     className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                     value={item.packaging}
                                     onChange={(e) => updateItem(idx, 'packaging', e.target.value)}
                                   >
                                      <option>Saco 25kg</option>
                                      <option>Bombona 50kg</option>
                                      <option>Barrica 50kg</option>
                                      <option>Tambor 200kg</option>
                                      <option>IBC 1000L</option>
                                   </select>
                                </div>
                                <div className="w-full md:w-24">
                                   <label className="block text-[10px] uppercase font-black text-technical mb-1 tracking-wider">Vol.</label>
                                   <input 
                                     type="number"
                                     className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                     value={item.quantity}
                                     onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                   />
                                </div>
                                <div className="w-full md:w-32">
                                   <label className="block text-[10px] uppercase font-black text-technical mb-1 tracking-wider">Preço (kg/L)</label>
                                   <input 
                                     type="number"
                                     step="0.01"
                                     className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none text-emerald-700"
                                     value={item.unitPrice}
                                     onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                   />
                                </div>
                                <div className="flex items-end pb-1">
                                   <button 
                                     onClick={() => removeItem(idx)}
                                     disabled={items.length === 1}
                                     className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                </div>
                             </div>
                          ))}
                          
                          <button 
                            onClick={addItem}
                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-technical font-bold text-xs uppercase hover:bg-gray-50 hover:border-primary-900 transition-all"
                          >
                             <Plus size={16} /> Adicionar Item
                          </button>
                       </div>

                       <div className="bg-primary-900 rounded-2xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                          <div>
                             <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total do Orçamento</p>
                             <h4 className="text-4xl font-black text-gold tracking-tighter">R$ {calculateTotal().toLocaleString('pt-BR')}</h4>
                          </div>
                          <button 
                            onClick={handleSaveProposal}
                            disabled={isSubmitting || !selectedCompany || items.some(i => !i.product)}
                            className="bg-gold hover:bg-white text-primary-900 px-12 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50"
                          >
                             {isSubmitting ? 'Gerando...' : 'Finalizar Proposta'}
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
