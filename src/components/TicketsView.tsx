import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Ticket, UserProfile } from '../types';
import { 
  Ticket as TicketIcon, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  MoreVertical,
  Plus,
  Send,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function TicketsView({ profile }: { profile: UserProfile }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sellers, setSellers] = useState<{uid: string, name: string}[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    sellerId: '',
    priority: 'Normal' as const
  });

  useEffect(() => {
    if (profile.role !== 'seller') {
      const q = query(collection(db, 'users'), where('role', '==', 'seller'), where('active', '==', true));
      getDocs(q).then(snap => {
        setSellers(snap.docs.map(d => ({ uid: d.id, name: d.data().name })));
      });
    }
  }, [profile]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const seller = sellers.find(s => s.uid === newTicket.sellerId);
      await addDoc(collection(db, 'tickets'), {
        ...newTicket,
        sellerName: seller?.name || 'Vendedor',
        managerId: profile.uid,
        managerName: profile.name,
        status: 'novo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewTicket({
        title: '',
        description: '',
        sellerId: '',
        priority: 'Normal'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tickets');
    }
  };

  useEffect(() => {
    let q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    
    if (profile.role === 'seller') {
      q = query(collection(db, 'tickets'), where('sellerId', '==', profile.uid), orderBy('updatedAt', 'desc'));
    } else if (profile.role === 'manager') {
       q = query(collection(db, 'tickets'), where('managerId', '==', profile.uid), orderBy('updatedAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'tickets');
    });

    return unsub;
  }, [profile]);

  const filteredTickets = tickets.filter(t => filterStatus === 'all' || t.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Centro de Tickets & Orientações</h2>
          <p className="text-technical text-sm">Comunicação estratégica entre gestão e força de vendas.</p>
        </div>
        {(profile.role === 'admin' || profile.role === 'manager') && (
          <button onClick={() => setIsModalOpen(true)} className="jrl-btn-primary"><Plus size={18} /> Nova Orientação</button>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm"
               onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
               <h3 className="text-xl font-black text-primary-900 uppercase tracking-tighter mb-6">Nova Orientação Tática</h3>
               <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-technical mb-1">Título da Missão</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Entrar via PAC na Cadam"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                      value={newTicket.title}
                      onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-technical mb-1">Vendedor Alvo</label>
                    <select 
                      required
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={newTicket.sellerId}
                      onChange={e => setNewTicket({...newTicket, sellerId: e.target.value})}
                    >
                      <option value="">Selecione o vendedor...</option>
                      {sellers.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-technical mb-1">Prioridade</label>
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                        value={newTicket.priority}
                        onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-technical mb-1">Descrição & Plano de Ação</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Descreva o que deve ser feito e qual o objetivo..."
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-sm"
                      value={newTicket.description}
                      onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-100 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
                     <button type="submit" className="flex-1 py-3 bg-primary-900 text-gold rounded-xl text-[10px] font-black uppercase shadow-lg">Lançar Comando</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
         {['all', 'novo', 'em_andamento', 'respondido', 'concluido'].map(s => (
           <button 
             key={s}
             onClick={() => setFilterStatus(s)}
             className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
               filterStatus === s ? 'bg-primary-900 text-white' : 'bg-white text-technical border-gray-200'
             }`}
           >
             {s === 'all' ? 'Todos' : s.replace('_', ' ')}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTickets.length === 0 ? (
          <div className="lg:col-span-2 jrl-card p-12 text-center text-gray-400">
             <TicketIcon size={48} className="mx-auto mb-4 opacity-10" />
             <p>Nenhum ticket encontrado.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <motion.div 
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="jrl-card p-6 border-l-4 border-l-gold hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                       ticket.priority === 'Urgente' ? 'bg-red-100 text-red-600' : 
                       ticket.priority === 'Alta' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-400">#{ticket.id.slice(-4).toUpperCase()}</span>
                 </div>
                 <div className="text-[10px] text-technical font-medium">
                    {format(ticket.createdAt?.toDate() || new Date(), 'dd/MM/yyyy HH:mm')}
                 </div>
              </div>

              <h3 className="text-lg font-bold text-primary-900 mb-2">{ticket.title}</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed line-clamp-3">{ticket.description}</p>

              <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center text-xs font-bold">
                    {ticket.managerName?.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Vínculo: {ticket.companyName}</p>
                    <p className="text-[10px] text-technical">Para: {profile.role === 'seller' ? 'Você' : 'Vendedor'}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    ticket.status === 'concluido' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                 }`}>
                   {ticket.status.replace('_', ' ')}
                 </span>
                 <div className="flex gap-2">
                    <button className="p-2 hover:bg-primary-50 text-primary-900 rounded-lg transition-all">
                       <MessageSquare size={18} />
                    </button>
                    <button className="jrl-btn-primary py-2 text-xs">Acessar Ticket</button>
                 </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
