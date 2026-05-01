import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Company, UserProfile, Priority, Temperature, CompanyStatus } from '../types';
import { 
  Building2, 
  MapPin, 
  Tag, 
  Thermometer, 
  Calendar, 
  Search, 
  Filter, 
  ChevronRight,
  TrendingUp,
  User,
  Plus,
  X,
  Shield,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logAudit } from '../lib/auditService';
import { getBaseQuery } from '../lib/permissions';
import { useTeam } from '../lib/useTeam';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompaniesViewProps {
  profile: UserProfile;
  onOpenAccount: (company: Company) => void;
}

export default function CompaniesView({ profile, onOpenAccount }: CompaniesViewProps) {
  const { teamIds, loading: loadingTeam } = useTeam(profile);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sellers, setSellers] = useState<{uid: string, name: string}[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    segmentoIndustrial: '',
    statusComercial: 'Novo cadastro' as CompanyStatus,
    temperaturaComercial: 'Morno' as Temperature,
    prioridade: 'Média' as Priority,
    potencial: 0,
    responsibleUserId: profile.uid,
    responsibleUserName: profile.name,
    active: true,
    
    // Address
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    pais: 'Brasil',

    // Contact
    telefonePrincipal: '',
    whatsapp: '',
    emailPrincipal: '',
    site: '',
    
    // Ficha
    condicaoPagamento: '',
    limiteCredito: 0,
    transportadoraPreferencial: '',
    tipoFretePadrao: 'CIF' as 'CIF' | 'FOB',
    compradorResponsavel: '',
    financeiroResponsavel: '',
    tecnicoResponsavel: '',
    emailsAdicionais: '',
    observacoesGerais: '',
    observacoesInternas: '',
    alertaGestor: '',

    // Controle
    origemCadastro: 'Comando JRL CRM',
  });

  const [segments, setSegments] = useState<string[]>([
    'Distribuição / Formulação Química',
    'Usinas Sucroenergéticas',
    'Curtumes & Couro',
    'Tintas & Coatings',
    'Polímeros, PU & Borrachas',
    'Agro & Fertilizantes',
    'Papel, Celulose & Embalagens',
    'Food, Pharma e Especialidades',
    'Solventes e Glicóis',
    'Sais, Bases e Minerais',
    'Industrial Geral'
  ]);
  const [newSegment, setNewSegment] = useState('');
  const [showInactives, setShowInactives] = useState(false);

  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  useEffect(() => {
    const unsubSegments = onSnapshot(collection(db, 'segments'), (snap) => {
      const dbSegments = snap.docs.map(d => d.id);
      setSegments(prev => [...new Set([...prev, ...dbSegments])]);
    });
    return unsubSegments;
  }, []);

  useEffect(() => {
    // Fetch sellers for assignment
    if (profile.role !== 'seller') {
      const fetchSellers = async () => {
        const q = query(collection(db, 'users'), where('active', '==', true));
        const snap = await getDocs(q);
        setSellers(snap.docs.map(d => ({ uid: d.id, name: d.data().name })));
      };
      fetchSellers();
    }
  }, [profile]);

  const handleLookupCNPJ = async () => {
    if (!formData.cnpj) return;
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      alert('CNPJ deve ter 14 dígitos.');
      return;
    }

    // Check for duplicates
    const dupQuery = query(collection(db, 'companies'), where('cnpj', '==', cleanCNPJ));
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      if (!confirm('Atenção: Já existe uma empresa cadastrada com este CNPJ. Deseja continuar mesmo assim?')) {
        return;
      }
    }

    setIsSearchingCNPJ(true);
    try {
      const { fetchCNPJData } = await import('../lib/cnpjService');
      const data = await fetchCNPJData(cleanCNPJ);
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.name,
        nomeFantasia: data.fantasyName,
        segmentoIndustrial: data.segment || prev.segmentoIndustrial,
        emailPrincipal: data.email,
        telefonePrincipal: data.phone,
        cep: data.address.zip,
        endereco: data.address.street,
        numero: data.address.number,
        complemento: data.address.complement,
        bairro: data.address.neighborhood,
        cidade: data.address.city,
        uf: data.address.state
      }));
    } catch (err) {
      alert('CNPJ não encontrado ou erro na busca.');
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  useEffect(() => {
    if (loadingTeam) return;

    const q = getBaseQuery(collection(db, 'companies'), profile, teamIds);

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'companies');
      setLoading(false);
    });

    return unsub;
  }, [profile, teamIds, loadingTeam]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial) return;

    const { addDoc, setDoc, doc, serverTimestamp } = await import('firebase/firestore');

    try {
      // Handle new segment
      if (newSegment) {
        await setDoc(doc(db, 'segments', newSegment), { createdAt: serverTimestamp() });
        formData.segmentoIndustrial = newSegment;
      }

      const docRef = await addDoc(collection(db, 'companies'), {
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        score: 50,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dataUltimaAtualizacaoCadastral: serverTimestamp()
      });

      await logAudit(
        profile.uid,
        profile.name,
        'company',
        docRef.id,
        'Criação de nova conta operacional completa'
      );

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'companies');
    }
  };

  const resetForm = () => {
    setFormData({
      razaoSocial: '', nomeFantasia: '', cnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '', segmentoIndustrial: '',
      statusComercial: 'Novo cadastro', temperaturaComercial: 'Morno', prioridade: 'Média', potencial: 0,
      responsibleUserId: profile.uid, responsibleUserName: profile.name, active: true,
      cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', pais: 'Brasil',
      telefonePrincipal: '', whatsapp: '', emailPrincipal: '', site: '',
      condicaoPagamento: '', limiteCredito: 0, transportadoraPreferencial: '', tipoFretePadrao: 'CIF',
      compradorResponsavel: '', financeiroResponsavel: '', tecnicoResponsavel: '', emailsAdicionais: '',
      observacoesGerais: '', observacoesInternas: '', alertaGestor: '', origemCadastro: 'Comando JRL CRM',
    });
    setNewSegment('');
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = (c.razaoSocial?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (c.nomeFantasia?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (c.cnpj || '').includes(searchTerm) ||
                          (c.cidade?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.statusComercial === filterStatus;
    const matchesActive = showInactives ? !c.active : c.active;
    return matchesSearch && matchesStatus && matchesActive;
  });

  if (loading) return <div className="h-64 flex items-center justify-center"><TrendingUp className="animate-spin text-primary-900" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Carteira de Clientes</h2>
          <p className="text-technical text-sm">Gerencie suas contas e prospectos estratégicos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-800 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="jrl-btn-primary"><Plus size={18} /> Nova Conta</button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gold"></div>
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-primary-900 uppercase tracking-tighter">Cadastrar Nova Conta</h3>
                  <p className="text-xs text-technical font-medium">Insira os dados estratégicos para iniciar o Comando JRL.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X size={20} className="text-technical" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* SECTION A: DADOS DA EMPRESA */}
                <div className="space-y-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <Building2 size={16} className="text-gold" /> A. Dados da Empresa
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Razão Social *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.razaoSocial}
                          onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Nome Fantasia</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.nomeFantasia}
                          onChange={(e) => setFormData({...formData, nomeFantasia: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">CNPJ *</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            required
                            placeholder="00.000.000/0000-00"
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                          />
                          <button type="button" onClick={handleLookupCNPJ} className="px-4 bg-primary-900 text-gold rounded-xl hover:bg-gold hover:text-primary-900 transition-all">
                             {isSearchingCNPJ ? <TrendingUp size={16} className="animate-spin" /> : <Search size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">I.E.</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm" value={formData.inscricaoEstadual} onChange={(e) => setFormData({...formData, inscricaoEstadual: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">I.M.</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm" value={formData.inscricaoMunicipal} onChange={(e) => setFormData({...formData, inscricaoMunicipal: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Segmento Industrial *</label>
                        <select 
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                          value={formData.segmentoIndustrial}
                          onChange={(e) => setFormData({...formData, segmentoIndustrial: e.target.value})}
                        >
                          <option value="">Selecione...</option>
                          {segments.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="new">+ Novo Segmento</option>
                        </select>
                        {formData.segmentoIndustrial === 'new' && (
                          <input 
                            type="text"
                            placeholder="Nome do novo segmento..."
                            className="mt-2 w-full px-4 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs font-bold"
                            value={newSegment}
                            onChange={(e) => setNewSegment(e.target.value)}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Status Comercial</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" value={formData.statusComercial} onChange={(e) => setFormData({...formData, statusComercial: e.target.value as any})} >
                           <option value="Novo cadastro">Novo cadastro</option>
                           <option value="Primeiro contato">Primeiro contato</option>
                           <option value="Diagnóstico em andamento">Diagnóstico em andamento</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Potencial Mensal (R$)</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.potencial} onChange={(e) => setFormData({...formData, potencial: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                {/* SECTION B: ENDEREÇO */}
                <div className="space-y-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <MapPin size={16} className="text-gold" /> B. Endereço
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">CEP</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.cep} onChange={(e) => setFormData({...formData, cep: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Logradouro</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Número</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Cidade *</label>
                        <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">UF *</label>
                        <input type="text" required maxLength={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm uppercase" value={formData.uf} onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Bairro</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.bairro} onChange={(e) => setFormData({...formData, bairro: e.target.value})} />
                      </div>
                   </div>
                </div>

                {/* SECTION C: CONTATOS */}
                <div className="space-y-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <Search size={16} className="text-gold" /> C. Contatos & Representantes
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Telefone Principal *</label>
                        <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.telefonePrincipal} onChange={(e) => setFormData({...formData, telefonePrincipal: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">WhatsApp</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">E-mail Principal *</label>
                        <input type="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.emailPrincipal} onChange={(e) => setFormData({...formData, emailPrincipal: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Comprador Resp.</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.compradorResponsavel} onChange={(e) => setFormData({...formData, compradorResponsavel: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Financeiro Resp.</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.financeiroResponsavel} onChange={(e) => setFormData({...formData, financeiroResponsavel: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Técnico Resp.</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.tecnicoResponsavel} onChange={(e) => setFormData({...formData, tecnicoResponsavel: e.target.value})} />
                      </div>
                   </div>
                </div>

                {/* SECTION D: CONDIÇÕES COMERCIAIS */}
                <div className="space-y-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <Tag size={16} className="text-gold" /> D. Condições Comerciais
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Condição de Pagamento</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.condicaoPagamento} onChange={(e) => setFormData({...formData, condicaoPagamento: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Limite de Crédito (R$)</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={formData.limiteCredito} onChange={(e) => setFormData({...formData, limiteCredito: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Vendedor Responsável *</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs disabled:opacity-50"
                          value={formData.responsibleUserId}
                          onChange={(e) => {
                            const selected = sellers.find(s => s.uid === e.target.value);
                            setFormData({...formData, responsibleUserId: e.target.value, responsibleUserName: selected?.name || ''});
                          }}
                          disabled={profile.role === 'seller'}
                        >
                          <option value={profile.uid}>{profile.name} (Você)</option>
                          {sellers.filter(s => s.uid !== profile.uid).map(s => (
                            <option key={s.uid} value={s.uid}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>

                {/* SECTION E: OBSERVAÇÕES */}
                <div className="space-y-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <AlertCircle size={16} className="text-gold" /> E. Observações & Gestão
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Observações Gerais</label>
                        <textarea rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-sm" value={formData.observacoesGerais} onChange={(e) => setFormData({...formData, observacoesGerais: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Observações Internas (Gestão)</label>
                        <textarea 
                           disabled={profile.role === 'seller'}
                           rows={4} 
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-sm disabled:opacity-50" 
                           value={formData.observacoesInternas} 
                           onChange={(e) => setFormData({...formData, observacoesInternas: e.target.value})} 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Alerta Estratégico do Gestor</label>
                        <input 
                           disabled={profile.role === 'seller'}
                           type="text" 
                           placeholder="Ex: Não vender sem aprovacao da diretoria por histórico..."
                           className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl font-bold text-sm text-red-900 placeholder:text-red-300 disabled:opacity-50" 
                           value={formData.alertaGestor} 
                           onChange={(e) => setFormData({...formData, alertaGestor: e.target.value})} 
                        />
                      </div>
                   </div>
                </div>

                <div className="pt-8 flex gap-4 sticky bottom-0 bg-white border-t border-gray-100 mt-12 pb-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
                   <button type="submit" className="flex-2 py-4 bg-primary-900 text-gold rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-gold hover:text-primary-900 transition-all">Ativar Missão JRL</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 w-fit">
         {['all', 'Novo cadastro', 'Primeiro contato', 'Diagnóstico completo', 'Proposta enviada', 'Negociação', 'Fechado ganho'].map(s => (
           <button 
             key={s}
             onClick={() => setFilterStatus(s)}
             className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               filterStatus === s ? "bg-primary-900 text-gold shadow-lg" : "bg-white text-technical hover:bg-gray-50"
             )}
           >
             {s === 'all' ? 'Ver Todos' : s}
           </button>
         ))}
         <div className="w-px bg-gray-100 mx-2 self-stretch" />
         <button 
            onClick={() => setShowInactives(!showInactives)}
            className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center",
               showInactives ? "bg-red-50 text-red-600" : "bg-white text-technical hover:bg-gray-50"
            )}
         >
            <AlertCircle size={14} />
            {showInactives ? 'Ver Ativos' : 'Ver Inativos'}
         </button>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="jrl-card p-12 text-center">
          <Building2 className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-technical">Nenhuma empresa encontrada com estes filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
             <CompanyCard 
               key={company.id} 
               company={company} 
               onClick={() => onOpenAccount(company)} 
             />
          ))}
        </div>
      )}
    </div>
  );
}

const CompanyCard: React.FC<{ company: Company; onClick: () => void }> = ({ company, onClick }) => {
  const getTempColor = (temp: Temperature) => {
    switch (temp) {
      case 'Urgente': return 'text-red-600 bg-red-50';
      case 'Quente': return 'text-orange-600 bg-orange-50';
      case 'Morno': return 'text-gold bg-orange-50/50';
      case 'Frio': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={cn(
        "jrl-card p-6 cursor-pointer group hover:shadow-2xl transition-all border-l-4",
        company.active ? "border-l-gold" : "border-l-red-500 opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="bg-primary-900 w-10 h-10 rounded-xl flex items-center justify-center text-gold shadow-lg group-hover:rotate-6 transition-transform">
           <Building2 size={20} />
        </div>
        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm", getTempColor(company.temperaturaComercial))}>
          {company.temperaturaComercial}
        </div>
      </div>

      <h3 className="font-black text-primary-900 text-lg mb-1 tracking-tighter group-hover:text-gold transition-colors line-clamp-1">{company.razaoSocial}</h3>
      <p className="text-technical text-[10px] font-black uppercase tracking-wider mb-6 opacity-60">{company.segmentoIndustrial}</p>

      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 text-xs font-bold text-technical">
           <MapPin size={14} className="text-gold/50" />
           <span className="truncate">{company.cidade} - {company.uf}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-technical">
           <User size={14} className="text-gold/50" />
           <span className="truncate">{company.responsibleUserName || 'Sem responsável'}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
           <span className="text-[9px] font-black uppercase text-technical tracking-widest opacity-40">Missão</span>
           <span className="text-[10px] font-black text-primary-900 uppercase tracking-tight">{company.statusComercial}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
           <span className="text-[9px] font-black uppercase text-technical tracking-widest opacity-40">Impacto</span>
           <span className="text-[10px] font-black text-emerald-600 uppercase">Score {company.score}</span>
        </div>
      </div>
    </motion.div>
  );
};
