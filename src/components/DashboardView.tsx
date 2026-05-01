import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { 
  Building2, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer 
} from 'recharts';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default function DashboardView({ profile }: { profile: UserProfile }) {
  const [stats, setStats] = useState({
    activeCompanies: 0,
    openProposalsValue: 0,
    pendingFollowups: 0,
    urgentTickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Real-time listeners for dashboard
      const qCompanies = profile.role === 'seller' ? 
        query(collection(db, 'companies'), where('responsibleUserId', '==', profile.uid)) :
        query(collection(db, 'companies'));
      
      const unsubCompanies = onSnapshot(qCompanies, (snap) => {
        setStats(prev => ({ ...prev, activeCompanies: snap.size }));
      });

      const qProposals = profile.role === 'seller' ?
        query(collection(db, 'proposals'), where('userId', '==', profile.uid), where('status', '==', 'sent')) :
        query(collection(db, 'proposals'), where('status', '==', 'sent'));

      const unsubProposals = onSnapshot(qProposals, (snap) => {
        const total = snap.docs.reduce((acc, d) => acc + (d.data().totalValue || 0), 0);
        setStats(prev => ({ ...prev, openProposalsValue: total }));
      });

      const qTickets = profile.role === 'seller' ?
        query(collection(db, 'tickets'), where('sellerId', '==', profile.uid), where('status', '!=', 'concluido')) :
        query(collection(db, 'tickets'), where('status', '!=', 'concluido'));

      const unsubTickets = onSnapshot(qTickets, (snap) => {
        setStats(prev => ({ ...prev, urgentTickets: snap.size }));
        setLoading(false);
      });

      return () => {
        unsubCompanies();
        unsubProposals();
        unsubTickets();
      };
    };

    fetchStats();
  }, [profile]);

  const kpis = [
    { label: 'Contas na Carteira', value: stats.activeCompanies.toString(), trend: 'Real-time', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Propostas em Negociação', value: `R$ ${(stats.openProposalsValue / 1000000).toFixed(1)}M`, trend: 'Pipeline', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Orientações Ativas', value: stats.urgentTickets.toString(), trend: 'Gestão', icon: MessageSquare, color: 'text-gold', bg: 'bg-orange-50' },
    { label: 'Atrasados', value: '0', trend: 'Atenção', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const chartData = [
    { name: 'Jan', total: 4000 },
    { name: 'Fev', total: 3000 },
    { name: 'Mar', total: 5000 },
    { name: 'Abr', total: 2780 },
    { name: 'Mai', total: 1890 },
    { name: 'Jun', total: 2390 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 tracking-tighter uppercase">Bom dia, {profile.name}</h2>
          <p className="text-technical text-sm font-medium">Aqui está o resumo da sua operação no JRL Command.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="jrl-card p-6 flex items-start justify-between group hover:shadow-xl transition-all cursor-pointer"
          >
            <div>
              <p className="text-technical text-[10px] font-black uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-primary-900">{kpi.value}</h3>
              <p className={cn("text-[10px] mt-2 font-black uppercase tracking-tighter", kpi.color)}>{kpi.trend}</p>
            </div>
            <div className={cn("p-3 rounded-xl transition-all group-hover:scale-110", kpi.bg)}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 jrl-card p-8 min-h-[400px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-primary-900 uppercase tracking-tighter">Evolução Comercial</h3>
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-primary-900"></span>
                 <span className="text-[10px] font-bold text-technical uppercase">Faturamento Estimado</span>
              </div>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E2A47" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0E2A47" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6C7A89', fontWeight: 'bold' }} />
                  <YAxis hide />
                  <ReTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0E2A47" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
        
        <div className="jrl-card p-8">
           <h3 className="text-lg font-black text-primary-900 uppercase tracking-tighter mb-6">Comando Superior</h3>
           <div className="space-y-4">
              {stats.urgentTickets > 0 ? (
                <div className="bg-primary-900 text-white p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                   <AlertTriangle className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24 rotate-12" />
                   <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-2">Atenção Crítica</p>
                   <h5 className="font-black text-lg mb-2 leading-tight">Você possui {stats.urgentTickets} orientações pendentes</h5>
                   <p className="text-xs text-white/60 font-medium mb-4">Verifique as missões delegadas pela diretoria para atingir a meta.</p>
                   <button className="w-full py-3 bg-gold text-primary-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">Ver Orientações</button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center opacity-60">
                   <Clock size={32} className="mx-auto mb-4 text-technical" />
                   <p className="text-xs font-bold text-technical uppercase tracking-widest">Sem alertas urgentes no momento</p>
                </div>
              )}

              <div className="p-6 bg-white border border-gray-100 rounded-3xl group cursor-pointer hover:border-gold transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <TrendingUp size={16} />
                  </div>
                  <h6 className="font-bold text-primary-900 text-sm">Meta do Mês</h6>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <p className="text-[10px] font-black text-technical uppercase mt-3 tracking-widest">65% Atingido • R$ 1.8M / R$ 3.0M</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
