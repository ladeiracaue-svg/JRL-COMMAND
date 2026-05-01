import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Building2, 
  MapPin, 
  Phone, 
  Target,
  FileText,
  AlertCircle,
  Truck,
  Calendar,
  CreditCard,
  ChevronRight,
  User,
  Layout
} from 'lucide-react';
import { Proposal, ProposalItem, UserProfile, Company, Branch, Contact, ProposalStatus } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { calculateProposalTotals, getNextProposalNumber } from '../services/proposalService';
import { logAudit } from '../lib/auditService';
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
import { format } from 'date-fns';

interface ProposalDrawerProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (proposalId: string) => void;
  proposalToEdit?: Proposal;
  duplicateFrom?: Proposal;
}

export default function ProposalDrawer({ 
  profile, 
  isOpen, 
  onClose, 
  onSuccess, 
  proposalToEdit,
  duplicateFrom 
}: ProposalDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [formData, setFormData] = useState<Partial<Proposal>>({
    status: 'Rascunho',
    currency: 'BRL',
    date: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    paymentTerms: '',
    deliveryTime: '',
    totalProducts: 0,
    totalTaxes: 0,
    totalFreight: 0,
    totalValue: 0
  });

  const [items, setItems] = useState<Partial<ProposalItem>[]>([
    { 
      productName: '', 
      volume: 0, 
      unit: 'kg', 
      packageType: 'Saco 25kg', 
      packageQty: 0, 
      unitPrice: 0, 
      itemTotal: 0,
      freightType: 'CIF',
      currency: 'BRL'
    }
  ]);

  // Load Companies
  useEffect(() => {
    if (!isOpen) return;
    const fetchCompanies = async () => {
      let q = query(collection(db, 'companies'), orderBy('razaoSocial', 'asc'));
      if (profile.role === 'seller') {
        q = query(collection(db, 'companies'), where('responsibleUserId', '==', profile.uid), orderBy('razaoSocial', 'asc'));
      }
      const snap = await getDocs(q);
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    };
    fetchCompanies();
  }, [isOpen, profile]);

  // Load selected company branches and contacts
  useEffect(() => {
    if (selectedCompany) {
      const fetchData = async () => {
        const [branchSnap, contactSnap] = await Promise.all([
          getDocs(collection(db, 'companies', selectedCompany.id, 'branches')),
          getDocs(collection(db, 'companies', selectedCompany.id, 'contacts'))
        ]);
        setBranches(branchSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)));
        setContacts(contactSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
      };
      fetchData();
    } else {
      setBranches([]);
      setContacts([]);
    }
  }, [selectedCompany]);

  // Pre-fill if editing or duplicating
  useEffect(() => {
    if (isOpen) {
      if (proposalToEdit || duplicateFrom) {
        const base = proposalToEdit || duplicateFrom;
        // Logic to fetch full proposal and its items
        const fetchFullProposal = async () => {
          setLoading(true);
          try {
            // Find company
            const q = query(collection(db, 'companies'));
            const compSnap = await getDocs(q);
            const comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() } as Company));
            const foundComp = comps.find(c => c.id === base?.companyId);
            if (foundComp) setSelectedCompany(foundComp);

            // Fetch items
            const itemsSnap = await getDocs(collection(db, 'proposals', base!.id, 'items'));
            const pItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProposalItem));

            if (proposalToEdit) {
              setFormData({ ...base });
              setItems(pItems);
            } else {
              // Duplicate
              setFormData({
                ...base,
                id: undefined,
                number: undefined,
                status: 'Rascunho',
                date: new Date(),
                validUntil: undefined,
                createdAt: undefined,
                updatedAt: undefined
              });
              setItems(pItems.map(i => ({ ...i, id: undefined, proposalId: undefined })));
            }
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        };
        fetchFullProposal();
      } else {
        // Reset for new
        setFormData({
            status: 'Rascunho',
            currency: 'BRL',
            date: new Date(),
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            paymentTerms: '',
            deliveryTime: '',
            totalProducts: 0,
            totalTaxes: 0,
            totalFreight: 0,
            totalValue: 0
        });
        setItems([
          { 
            productName: '', 
            volume: 0, 
            unit: 'kg', 
            packageType: 'Saco 25kg', 
            packageQty: 0, 
            unitPrice: 0, 
            itemTotal: 0,
            freightType: 'CIF',
            currency: 'BRL'
          }
        ]);
        setSelectedCompany(null);
        setSelectedBranch(null);
        setSelectedContact(null);
      }
    }
  }, [isOpen, proposalToEdit, duplicateFrom]);

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto calculations
    if (field === 'unitPrice' || field === 'volume') {
      item.itemTotal = (item.unitPrice || 0) * (item.volume || 0);
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { 
      productName: '', 
      volume: 0, 
      unit: 'kg', 
      packageType: 'Saco 25kg', 
      packageQty: 0, 
      unitPrice: 0, 
      itemTotal: 0,
      freightType: 'CIF',
      currency: 'BRL'
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (items.some(i => !i.productName || !i.volume || !i.unitPrice)) {
       alert('Por favor, preencha todos os campos obrigatórios dos itens (Produto, Volume e Preço).');
       return;
    }

    setLoading(true);
    try {
      const totals = calculateProposalTotals(items);
      const isNew = !proposalToEdit;
      
      let proposalNumber = formData.number;
      if (isNew) {
        proposalNumber = await getNextProposalNumber();
      }

      const proposalData = {
        ...formData,
        number: proposalNumber,
        companyId: selectedCompany.id,
        companyName: selectedCompany.razaoSocial,
        branchId: selectedBranch?.id || null,
        contactId: selectedContact?.id || null,
        userId: profile.uid,
        userName: profile.name,
        ...totals,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        proposalData.createdAt = serverTimestamp();
      }

      let pId = proposalToEdit?.id;
      if (isNew) {
        const docRef = await addDoc(collection(db, 'proposals'), proposalData);
        pId = docRef.id;
        
        // Add items as sub-collection
        for (const item of items) {
          await addDoc(collection(db, 'proposals', pId, 'items'), {
            ...item,
            proposalId: pId,
            createdAt: serverTimestamp()
          });
        }

        await addDoc(collection(db, 'companies', selectedCompany.id, 'interactions'), {
          userId: profile.uid,
          userName: profile.name,
          companyId: selectedCompany.id,
          type: 'proposal',
          description: `Nova proposta gerada: ${proposalNumber} no valor de R$ ${totals.totalValue.toLocaleString('pt-BR')}`,
          createdAt: serverTimestamp()
        });

        await logAudit(profile.uid, profile.name, 'proposal', pId, duplicateFrom ? `Proposta duplicada a partir de ${duplicateFrom.number}` : 'Proposta Criada');
      } else {
        await updateDoc(doc(db, 'proposals', pId!), proposalData);
        
        // Items update is more complex (delete and recreate or sync)
        // For brevity and sprint requirements, we'll sync by replacing for now (careful with IDs)
        // Better: Fetch items and update matching, add new, delete missing.
        const existingItemsSnap = await getDocs(collection(db, 'proposals', pId!, 'items'));
        for (const d of existingItemsSnap.docs) {
           await updateDoc(doc(db, 'proposals', pId!, 'items', d.id), { active: false }); // mark as inactive or delete
           // In this sprint, let's just delete and recreate to keep it simple and clean
           const { deleteDoc } = await import('firebase/firestore');
           await deleteDoc(doc(db, 'proposals', pId!, 'items', d.id));
        }

        for (const item of items) {
          await addDoc(collection(db, 'proposals', pId!, 'items'), {
            ...item,
            proposalId: pId,
            createdAt: serverTimestamp()
          });
        }

        await logAudit(profile.uid, profile.name, 'proposal', pId!, 'Proposta Atualizada');
      }

      onSuccess(pId!);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proposals');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateProposalTotals(items);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="bg-primary-900 text-gold p-2.5 rounded-2xl shadow-lg">
                     {proposalToEdit ? <FileText size={24} /> : <Plus size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-primary-900 uppercase tracking-tighter">
                      {proposalToEdit ? `Editar Proposta ${proposalToEdit.number}` : duplicateFrom ? 'Duplicar Proposta' : 'Novo Orçamento Técnico'}
                    </h3>
                    <p className="text-[10px] font-bold text-technical uppercase tracking-widest opacity-60">JRL COMMAND • SPRINT 3</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                  <X size={24} className="text-primary-900" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-12 pb-32">
               {/* STEP 1: CLIENT AND INFOS */}
               <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <Building2 size={18} className="text-gold" />
                    <h4 className="text-[11px] font-black uppercase text-primary-900 tracking-[0.2em]">Identificação do Cliente</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-technical mb-2 block">Empresa Madre *</label>
                        <select 
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-900"
                          value={selectedCompany?.id || ''}
                          onChange={(e) => {
                            const c = companies.find(x => x.id === e.target.value);
                            setSelectedCompany(c || null);
                            setSelectedBranch(null);
                            setSelectedContact(null);
                          }}
                          required
                        >
                           <option value="">Selecione uma empresa...</option>
                           {companies.map(c => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-technical mb-2 block">Filial / Unidade de Entrega</label>
                        <select 
                          disabled={!selectedCompany}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-900 disabled:opacity-50"
                          value={selectedBranch?.id || ''}
                          onChange={(e) => {
                            const b = branches.find(x => x.id === e.target.value);
                            setSelectedBranch(b || null);
                          }}
                        >
                           <option value="">Unidade Principal / Matriz</option>
                           {branches.map(b => <option key={b.id} value={b.id}>{b.nomeUnidade} ({b.cidade})</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-technical mb-2 block">Contato de Referência</label>
                        <select 
                          disabled={!selectedCompany}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-900 disabled:opacity-50"
                          value={selectedContact?.id || ''}
                          onChange={(e) => {
                            const c = contacts.find(x => x.id === e.target.value);
                            setSelectedContact(c || null);
                          }}
                        >
                           <option value="">Selecione um contato...</option>
                           {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-technical mb-2 block">Status da Proposta</label>
                        <select 
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-primary-900"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as ProposalStatus})}
                        >
                           <option value="Rascunho">Rascunho</option>
                           <option value="Em elaboração">Em Elaboração</option>
                           <option value="Enviada">Enviada</option>
                           <option value="Em negociação">Em Negociação</option>
                           <option value="Fechada ganha">Fechada Ganha</option>
                           <option value="Fechada perdida">Fechada Perdida</option>
                           <option value="Cancelada">Cancelada</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-technical mb-2 block">Validade (Data)</label>
                        <input 
                           type="date"
                           className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-900"
                           value={formData.validUntil ? format(new Date(formData.validUntil.seconds ? formData.validUntil.toDate() : formData.validUntil), 'yyyy-MM-dd') : ''}
                           onChange={(e) => setFormData({...formData, validUntil: new Date(e.target.value)})}
                        />
                     </div>
                  </div>
               </section>

               {/* STEP 2: ITEMS */}
               <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3">
                      <Layout size={18} className="text-gold" />
                      <h4 className="text-[11px] font-black uppercase text-primary-900 tracking-[0.2em]">Itens e Produtos</h4>
                    </div>
                    <button 
                      type="button" 
                      onClick={addItem}
                      className="px-4 py-2 bg-primary-900 text-gold rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gold hover:text-primary-900 transition-all"
                    >
                      <Plus size={14} /> Novo Item
                    </button>
                  </div>

                  <div className="space-y-4">
                     {items.map((item, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all group relative"
                        >
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                              <div className="md:col-span-2">
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Produto / SKU *</label>
                                 <input 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-1 focus:ring-primary-900"
                                    placeholder="Ex: Ácido Clorídrico 33%..."
                                    value={item.productName}
                                    onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Família</label>
                                 <input 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none"
                                    placeholder="Ex: Ácidos..."
                                    value={item.productFamily}
                                    onChange={(e) => updateItem(idx, 'productFamily', e.target.value)}
                                 />
                              </div>
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Volume Total *</label>
                                 <div className="flex gap-1">
                                    <input 
                                      type="number"
                                      className="w-full p-3 bg-gray-50 border-none rounded-xl font-black text-sm outline-none"
                                      value={item.volume}
                                      onChange={(e) => updateItem(idx, 'volume', Number(e.target.value))}
                                      required
                                    />
                                    <select 
                                      className="w-16 bg-gray-100 rounded-xl text-[10px] font-black uppercase"
                                      value={item.unit}
                                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                    >
                                       <option value="kg">KG</option>
                                       <option value="L">L</option>
                                       <option value="ton">TON</option>
                                    </select>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Preço Unitário *</label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-technical">R$</span>
                                    <input 
                                       type="number"
                                       step="0.001"
                                       className="w-full p-3 pl-8 bg-gray-50 border-none rounded-xl font-black text-sm outline-none text-emerald-600"
                                       value={item.unitPrice}
                                       onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                       required
                                    />
                                 </div>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Embalagem</label>
                                 <select 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-xs"
                                    value={item.packageType}
                                    onChange={(e) => updateItem(idx, 'packageType', e.target.value)}
                                 >
                                    <option value="Saco 25kg">Saco 25kg</option>
                                    <option value="Bombona 50kg">Bombona 50kg</option>
                                    <option value="Tambor 200kg">Tambor 200kg</option>
                                    <option value="IBC 1000L">IBC 1000L</option>
                                    <option value="Granel">Granel</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Frete Item</label>
                                 <select 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-xs"
                                    value={item.freightType}
                                    onChange={(e) => updateItem(idx, 'freightType', e.target.value as any)}
                                 >
                                    <option value="CIF">CIF</option>
                                    <option value="FOB">FOB</option>
                                    <option value="Retirada">Retirada</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black uppercase text-technical mb-1 block">Subtotal Item</label>
                                 <div className="p-3 bg-primary-50 rounded-xl font-black text-sm text-primary-900 border border-primary-100">
                                    R$ {(item.itemTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </div>
                              </div>
                           </div>

                           {items.length > 1 && (
                             <button 
                               type="button"
                               onClick={() => removeItem(idx)}
                               className="absolute -top-2 -right-2 p-2 bg-white border border-red-100 text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 size={14} />
                             </button>
                           )}
                        </motion.div>
                     ))}
                  </div>
               </section>

               {/* STEP 3: LOGISTICS & PAYMENT */}
               <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                       <CreditCard size={18} className="text-gold" />
                       <h4 className="text-[11px] font-black uppercase text-primary-900 tracking-[0.2em]">Comercial & Financeiro</h4>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-technical mb-2 block">Condição de Pagamento</label>
                          <input 
                             className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                             placeholder="Ex: 28 dias via boleto..."
                             value={formData.paymentTerms}
                             onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-technical mb-2 block">Prazo de Entrega</label>
                          <input 
                             className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                             placeholder="Ex: 3 a 5 dias úteis..."
                             value={formData.deliveryTime}
                             onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                       <Truck size={18} className="text-gold" />
                       <h4 className="text-[11px] font-black uppercase text-primary-900 tracking-[0.2em]">Logística & Outros</h4>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-technical mb-2 block">Total de Frete (R$)</label>
                          <input 
                             type="number"
                             className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                             value={formData.totalFreight}
                             onChange={(e) => setFormData({...formData, totalFreight: Number(e.target.value)})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-technical mb-2 block">Total de Impostos (R$)</label>
                          <input 
                             type="number"
                             className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none"
                             value={formData.totalTaxes}
                             onChange={(e) => setFormData({...formData, totalTaxes: Number(e.target.value)})}
                          />
                       </div>
                    </div>
                  </div>
               </section>

               {/* STEP 4: OBSERVATIONS */}
               <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-technical tracking-widest block">Observações (PDF Cliente)</label>
                     <textarea 
                        rows={4}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="Observações que aparecerão no PDF para o cliente..."
                        value={formData.observations}
                        onChange={(e) => setFormData({...formData, observations: e.target.value})}
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-technical tracking-widest block">Observações Internas (Somente Equipe)</label>
                     <textarea 
                        rows={4}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="Notas para faturamento, logística ou gerência..."
                        value={formData.internalObservations}
                        onChange={(e) => setFormData({...formData, internalObservations: e.target.value})}
                     />
                  </div>
               </section>
            </form>

            {/* Footer Summary */}
            <div className="p-8 border-t border-gray-100 bg-white absolute bottom-0 left-0 right-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[3rem] z-10">
               <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-12">
                     <div>
                        <p className="text-[10px] font-black uppercase text-technical tracking-widest opacity-60 mb-1">Subtotal Produtos</p>
                        <p className="text-xl font-black text-primary-900 leading-none">R$ {totals.totalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                     </div>
                     <div className="hidden md:block w-px h-10 bg-gray-100" />
                     <div>
                        <p className="text-[10px] font-black uppercase text-technical tracking-widest opacity-60 mb-1">Total Orçamento</p>
                        <p className="text-3xl font-black text-gold leading-none">R$ {(totals.totalValue + (formData.totalFreight || 0) + (formData.totalTaxes || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                     <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 md:flex-none px-8 py-4 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                     >
                        Cancelar
                     </button>
                     <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !selectedCompany}
                        className="flex-1 md:flex-none px-12 py-4 bg-primary-900 text-gold rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary-900/40 hover:bg-gold hover:text-primary-900 transition-all disabled:opacity-50"
                     >
                        {loading ? 'Salvando...' : proposalToEdit ? 'Atualizar Proposta' : 'Gerar Proposta'}
                     </button>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
