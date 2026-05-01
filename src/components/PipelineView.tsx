import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Company, UserProfile, CompanyStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MoreVertical, 
  Clock, 
  Building2, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STAGES: CompanyStatus[] = [
  'Novo cadastro',
  'Pesquisar dados',
  'Primeiro contato',
  'Diagnóstico em andamento',
  'Proposta enviada',
  'Negociação',
  'Fechado ganho'
];

export default function PipelineView({ profile, onOpenAccount }: { profile: UserProfile, onOpenAccount: (c: Company) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'companies'));
    if (profile.role === 'seller') {
      q = query(collection(db, 'companies'), where('responsibleUserId', '==', profile.uid));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const handleMove = async (companyId: string, newStatus: CompanyStatus) => {
    try {
      const docRef = doc(db, 'companies', companyId);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Auto interaction log
      await addDoc(collection(db, 'companies', companyId, 'interactions'), {
        userId: profile.uid,
        userName: profile.name,
        type: 'status_change',
        description: `Status alterado para: ${newStatus}`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-primary-900">Carregando pipeline...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h2>
          <p className="text-technical text-sm">Visualize o progresso das suas negociações.</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Ganho</div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary-900"></div> Ativo</div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full min-h-[600px] no-scrollbar">
        {STAGES.map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72 flex flex-col h-full rounded-2xl bg-gray-100/50 p-3">
             <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                   <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{stage}</h4>
                   <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                     {companies.filter(c => c.status === stage).length}
                   </span>
                </div>
                <MoreVertical size={14} className="text-gray-400" />
             </div>

             <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {companies
                  .filter(c => c.status === stage)
                  .map(c => (
                    <PipelineCard 
                      key={c.id} 
                      company={c} 
                      onClick={() => onOpenAccount(c)}
                    />
                  ))
                }
                <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-primary-800 hover:border-primary-800/30 transition-all text-xs font-bold flex items-center justify-center gap-1">
                  <Plus size={14} /> Novo Prospecto
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PipelineCard: React.FC<{ company: Company; onClick: () => void }> = ({ company, onClick }) => {
  return (
    <motion.div 
      layoutId={company.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
         <span className={cn(
           "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
           company.temperature === 'Fogo' ? 'bg-red-100 text-red-600' : 
           company.temperature === 'Quente' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
         )}>
           {company.temperature}
         </span>
         <span className="text-[9px] font-bold text-gold">SC {company.score}</span>
      </div>
      <h5 className="text-sm font-bold text-slate-900 group-hover:text-primary-800 transition-colors line-clamp-1">{company.name}</h5>
      <p className="text-[10px] text-technical mb-3">{company.segment}</p>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-[10px] text-gray-500 font-medium">
         <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>3 dias</span>
         </div>
         <div className="flex items-center gap-1 text-primary-900">
            <TrendingUp size={12} />
            <span>Potencial R$ {(company.potential/1000).toFixed(0)}k</span>
         </div>
      </div>
    </motion.div>
  );
};
