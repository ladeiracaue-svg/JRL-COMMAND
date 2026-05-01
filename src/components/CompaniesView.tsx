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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.cnpj?.includes(searchTerm) || 
                          c.segment?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <button className="jrl-btn-primary"><Plus size={18} /> Nova Conta</button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
         {['all', 'Novo cadastro', 'Em qualificação', 'Proposta enviada', 'Cliente ativo'].map(s => (
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

function CompanyCard({ company, onClick }: { company: Company; onClick: () => void }) {
  const getTempColor = (temp: Temperature) => {
    switch (temp) {
      case 'Fogo': return 'text-red-600 bg-red-50';
      case 'Quente': return 'text-orange-600 bg-orange-50';
      case 'Morno': return 'text-gold bg-orange-50/50';
      default: return 'text-blue-600 bg-blue-50';
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
}
