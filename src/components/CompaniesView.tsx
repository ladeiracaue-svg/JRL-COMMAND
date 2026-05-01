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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompaniesViewProps {
  profile: UserProfile;
  onOpenAccount: (company: Company) => void;
}

export default function CompaniesView({ profile, onOpenAccount }: CompaniesViewProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    fantasyName: '',
    cnpj: '',
    stateRegistration: '',
    cityRegistration: '',
    segment: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    responsibleUserId: profile.uid,
    responsibleUserName: profile.name,
    temperature: 'Morno' as Temperature,
    priority: 'Média' as Priority,
    potential: 0,
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: '',
      country: 'Brasil'
    }
  });

  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  const [sellers, setSellers] = useState<{uid: string, name: string}[]>([]);

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
    setIsSearchingCNPJ(true);
    try {
      const { fetchCNPJData } = await import('../lib/cnpjService');
      const data = await fetchCNPJData(formData.cnpj);
      setFormData(prev => ({
        ...prev,
        name: data.name,
        fantasyName: data.fantasyName,
        segment: data.segment,
        email: data.email,
        phone: data.phone,
        address: {
          ...prev.address,
          ...data.address
        }
      }));
    } catch (err) {
      alert('CNPJ não encontrado ou erro na busca.');
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  useEffect(() => {
    let q = query(collection(db, 'companies'), limit(50));
    
    // Role-based filtering
    if (profile.role === 'seller') {
      q = query(collection(db, 'companies'), where('responsibleUserId', '==', profile.uid));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'companies');
    });

    return unsub;
  }, [profile]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...formData,
        status: 'Novo cadastro',
        score: 50,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await logAudit(
        profile.uid,
        profile.name,
        'company',
        docRef.id,
        'Criação de nova conta'
      );
      
      setIsModalOpen(false);
      setFormData({
        name: '',
        fantasyName: '',
        cnpj: '',
        stateRegistration: '',
        cityRegistration: '',
        segment: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
        responsibleUserId: profile.uid,
        responsibleUserName: profile.name,
        temperature: 'Morno',
        priority: 'Média',
        potential: 0,
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zip: '',
          country: 'Brasil'
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'companies');
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (c.cnpj || '').includes(searchTerm) || 
                          (c.segment?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
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
              
              <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Fiscal Section */}
                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <Shield size={16} className="text-gold" /> Identidade Fiscal
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">CNPJ</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            required
                            placeholder="00.000.000/0000-00"
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={handleLookupCNPJ}
                            disabled={isSearchingCNPJ}
                            className="px-4 bg-primary-900 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
                          >
                            <TrendingUp size={16} className={isSearchingCNPJ ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Razão Social</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Nome Fantasia</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.fantasyName}
                          onChange={(e) => setFormData({...formData, fantasyName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">I.E.</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.stateRegistration}
                          onChange={(e) => setFormData({...formData, stateRegistration: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">I.M.</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.cityRegistration}
                          onChange={(e) => setFormData({...formData, cityRegistration: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                {/* Logistics */}
                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <MapPin size={16} className="text-gold" /> Localização & Logística
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.zip}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Logradouro</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.street}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Número</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.number}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, number: e.target.value}})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Bairro</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.neighborhood}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, neighborhood: e.target.value}})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Cidade</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.city}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">UF</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm uppercase"
                          value={formData.address.state}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value.toUpperCase()}})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">País</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.address.country}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                        />
                      </div>
                   </div>
                </div>

                {/* Commerical */}
                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 text-xs font-black text-primary-900 uppercase tracking-widest border-b pb-2">
                     <Tag size={16} className="text-gold" /> Perfil Comercial
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Segmento Industrial</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-xs"
                          value={formData.segment}
                          onChange={(e) => setFormData({...formData, segment: e.target.value})}
                          required
                        >
                          <option value="">Selecione...</option>
                          <option value="Distribuição / Formulação Química">Distribuição / Química</option>
                          <option value="Usinas Sucroenergéticas">Usinas Sucroenergéticas</option>
                          <option value="Curtumes & Couro">Curtumes & Couro</option>
                          <option value="Tintas & Coatings">Tintas & Coatings</option>
                          <option value="Polímeros, PU & Borrachas">Polímeros, PU & Borrachas</option>
                          <option value="Agro & Fertilizantes">Agro & Fertilizantes</option>
                          <option value="Papel, Celulose & Embalagens">Papel & Celulose</option>
                          <option value="Food, Pharma e Especialidades">Food & Pharma</option>
                          <option value="Solventes e Glicóis">Solventes e Glicóis</option>
                          <option value="Sais, Bases e Minerais">Sais, Bases & Minerais</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Responsável Comercial</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-xs disabled:opacity-50"
                          value={formData.responsibleUserId}
                          onChange={(e) => {
                            const name = sellers.find(s => s.uid === e.target.value)?.name || profile.name;
                            setFormData({...formData, responsibleUserId: e.target.value, responsibleUserName: name});
                          }}
                          disabled={profile.role === 'seller'}
                        >
                          {profile.role === 'seller' ? (
                            <option value={profile.uid}>{profile.name}</option>
                          ) : (
                            <>
                              <option value={profile.uid}>{profile.name} (Você)</option>
                              {sellers.filter(s => s.uid !== profile.uid).map(s => (
                                <option key={s.uid} value={s.uid}>{s.name}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Temperatura Inicial</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-xs"
                          value={formData.temperature}
                          onChange={(e) => setFormData({...formData, temperature: e.target.value as Temperature})}
                        >
                          <option value="Frio">Frio</option>
                          <option value="Morno">Morno</option>
                          <option value="Quente">Quente</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-technical mb-1 tracking-wider">Potencial Mensal (R$)</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
                          value={formData.potential}
                          onChange={(e) => setFormData({...formData, potential: Number(e.target.value)})}
                        />
                      </div>
                   </div>
                </div>

                <div className="pt-4 flex gap-4 text-xs font-black sticky bottom-0 bg-white pb-4 border-t border-gray-50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 text-slate-600 transition-all uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-primary-900 text-gold rounded-2xl hover:bg-gold hover:text-primary-900 transition-all uppercase tracking-widest shadow-xl">Salvar e Comando</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
         {['all', 'Novo cadastro', 'Primeiro contato', 'Diagnóstico completo', 'Proposta enviada', 'Negociação', 'Fechado ganho'].map(s => (
           <button 
             key={s}
             onClick={() => setFilterStatus(s)}
             className={cn(
               "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
               filterStatus === s ? "bg-primary-900 text-white border-primary-900" : "bg-white text-technical border-gray-200 hover:border-gray-300"
             )}
           >
             {s === 'all' ? 'Todos' : s}
           </button>
         ))}
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
      className="jrl-card p-5 cursor-pointer group hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="bg-primary-900/5 p-2 rounded-lg">
           <Building2 className="text-primary-900" size={20} />
        </div>
        <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase", getTempColor(company.temperature))}>
          {company.temperature}
        </div>
      </div>

      <h3 className="font-bold text-slate-900 mb-1 group-hover:text-primary-800 transition-colors">{company.name}</h3>
      <p className="text-technical text-xs mb-4 line-clamp-1">{company.segment}</p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-600">
           <MapPin size={14} className="text-gray-400" />
           <span>{company.address.city} - {company.address.state}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
           <User size={14} className="text-gray-400" />
           <span>{company.responsibleUserName || 'Sem responsável'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
           <TrendingUp size={14} className="text-gray-400" />
           <span>Score: <span className="font-bold text-primary-900">{company.score}</span></span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
           <span className="text-[10px] uppercase text-technical font-bold">Status</span>
           <span className="text-xs font-semibold text-primary-900">{company.status}</span>
        </div>
        <button className="p-2 bg-gray-50 rounded-lg text-primary-900 group-hover:bg-primary-900 group-hover:text-white transition-all">
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};
