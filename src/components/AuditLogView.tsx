import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, User, Building2, FileText, Search, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entityType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'company': return <Building2 size={16} />;
      case 'proposal': return <FileText size={16} />;
      case 'user': return <User size={16} />;
      case 'branch': return <Building2 size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 tracking-tighter uppercase">Rastro do Comando</h2>
          <p className="text-technical text-xs font-medium">Auditoria completa de todas as atividades do sistema.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-technical" size={18} />
        <input 
          type="text" 
          placeholder="Buscar no log de auditoria..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-900 transition-all font-medium text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Clock className="animate-spin text-primary-900" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, i) => (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 text-technical flex items-center justify-center group-hover:bg-primary-900 group-hover:text-white transition-all">
                {getEntityIcon(log.entityType)}
              </div>
              
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-900 text-sm">{log.userName}</span>
                    <span className="text-[10px] text-technical font-medium">realizou</span>
                    <span className="text-xs font-black text-primary-900 uppercase tracking-tighter">{log.action}</span>
                 </div>
                 <p className="text-[10px] text-technical">
                   Entidade: <span className="font-bold uppercase">{log.entityType}</span> • ID: {log.entityId}
                 </p>
              </div>

              <div className="text-right">
                 <p className="text-xs font-bold text-slate-800">
                   {log.createdAt?.toDate ? format(log.createdAt.toDate(), 'HH:mm:ss') : '--:--:--'}
                 </p>
                 <p className="text-[10px] text-technical">
                   {log.createdAt?.toDate ? format(log.createdAt.toDate(), 'dd MMM yyyy', { locale: ptBR }) : '--/--/--'}
                 </p>
              </div>
            </motion.div>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className="py-20 text-center opacity-30">
               <Activity size={48} className="mx-auto mb-2" />
               <p className="font-bold uppercase text-xs tracking-widest">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
