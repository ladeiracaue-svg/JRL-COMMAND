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
  Plus
} from 'lucide-react';
import { Company, UserProfile, Interaction, Ticket, Priority } from '../types';
import { getStrategy, getMission } from '../lib/missionEngine';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

interface AccountPanelProps {
  company: Company;
  profile: UserProfile;
  onClose: () => void;
}

export default function AccountPanel({ company, profile, onClose }: AccountPanelProps) {
  const [activeTab, setActiveTab] = useState<'strategy' | 'actions' | 'tickets' | 'history'>('strategy');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mission and Strategy
  const strategy = getStrategy(company.segment);
  const mission = getMission(company);

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
      setLoading(false);
    });

    return () => {
      unsubInter();
      unsubTickets();
    };
  }, [company.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado com sucesso!');
  };

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
      <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
        {[
          { id: 'strategy', label: 'Estratégia', icon: Target },
          { id: 'actions', label: 'Ações', icon: CheckCircle2 },
          { id: 'tickets', label: 'Tickets', icon: MessageSquare },
          { id: 'history', label: 'Histórico', icon: History },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === t.id ? 'border-primary-900 text-primary-900 bg-white' : 'border-transparent text-technical hover:text-primary-800'
            }`}
          >
            <t.icon size={16} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
        
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            {/* Missão */}
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 relative overflow-hidden">
               <Zap className="absolute -right-4 -bottom-4 text-gold/20 w-24 h-24 rotate-12" />
               <h4 className="text-gold font-bold text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Zap size={16} /> Gerente Virtual: Missão
               </h4>
               <h3 className="text-primary-900 font-extrabold text-xl mb-2">{mission.title}</h3>
               <p className="text-primary-900/80 text-sm leading-relaxed">{mission.action}</p>
               <button className="mt-4 jrl-btn-primary w-full bg-gold hover:bg-gold/90 text-primary-900">Marcar como Concluída</button>
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

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Orientações do Gestor</h3>
              {(profile.role === 'admin' || profile.role === 'manager') && (
                <button className="jrl-btn-primary py-2 text-xs"><Plus size={14} /> Nova Orientação</button>
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
      <div className="p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 shrink-0">
          <button className="jrl-btn-secondary w-full py-4 text-xs font-bold uppercase tracking-widest"><FileText size={18} /> Proposta</button>
          <button className="jrl-btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest">Atualizar Status</button>
      </div>
    </motion.div>
  );
}
