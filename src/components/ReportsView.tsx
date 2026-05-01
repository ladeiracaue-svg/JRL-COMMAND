import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  ChevronDown, 
  Filter,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Search
} from 'lucide-react';
import { UserProfile, Company, Proposal } from '../types';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function ReportsView({ profile }: { profile: UserProfile }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [reportData, setReportData] = useState<any[]>([]);

  // Sample data for the visualization - in a real app this would be aggregated from Firestore
  const salesBySegment = [
    { name: 'Química', value: 450000, color: '#0E2A47' },
    { name: 'Usinas', value: 320000, color: '#D4AF37' },
    { name: 'Food', value: 280000, color: '#6C7A89' },
    { name: 'Tintas', value: 190000, color: '#2C3E50' },
  ];

  const salesPerformance = [
    { month: 'Jan', sales: 120000, target: 150000 },
    { month: 'Fev', sales: 180000, target: 150000 },
    { month: 'Mar', sales: 250000, target: 200000 },
    { month: 'Abr', sales: 210000, target: 200000 },
    { month: 'Mai', sales: 310000, target: 250000 },
    { month: 'Jun', sales: 285000, target: 300000 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 tracking-tighter uppercase">Relatórios Estratégicos</h2>
          <p className="text-technical text-sm font-medium">Análise de performance, faturamento e conversão.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-50 transition-all">
             <Calendar size={16} /> Últimos 30 dias
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-gold rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gold hover:text-primary-900 transition-all shadow-lg">
             <Download size={16} /> Exportar Bi
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="jrl-card p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={20} />
               </div>
               <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+18.2%</span>
            </div>
            <p className="text-technical text-[10px] font-black uppercase tracking-widest mb-1">Faturamento Total</p>
            <h3 className="text-2xl font-black text-primary-900">R$ 1.445.000</h3>
         </div>
         <div className="jrl-card p-6 border-l-4 border-l-gold">
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-orange-50 text-gold rounded-lg">
                  <BarChart3 size={20} />
               </div>
               <span className="text-[10px] font-black text-gold bg-orange-50 px-2 py-1 rounded">24.5% Conv.</span>
            </div>
            <p className="text-technical text-[10px] font-black uppercase tracking-widest mb-1">Ticket Médio</p>
            <h3 className="text-2xl font-black text-primary-900">R$ 42.500</h3>
         </div>
         <div className="jrl-card p-6 border-l-4 border-l-primary-900">
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-slate-50 text-primary-900 rounded-lg">
                  <PieIcon size={20} />
               </div>
               <span className="text-[10px] font-black text-primary-900 bg-slate-50 px-2 py-1 rounded">Meta 82%</span>
            </div>
            <p className="text-technical text-[10px] font-black uppercase tracking-widest mb-1">Margem Média</p>
            <h3 className="text-2xl font-black text-primary-900">18.4%</h3>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="jrl-card p-8 min-h-[450px]">
            <h3 className="text-lg font-black text-primary-900 uppercase tracking-tighter mb-8">Performance Mensal vs Meta</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesPerformance}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6C7A89', fontWeight: 'bold' }} />
                     <YAxis hide />
                     <Tooltip 
                        cursor={{ fill: 'rgba(14, 42, 71, 0.05)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                     />
                     <Bar dataKey="sales" fill="#0E2A47" radius={[6, 6, 0, 0]} name="Realizado" />
                     <Bar dataKey="target" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Meta" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="jrl-card p-8 min-h-[450px]">
            <h3 className="text-lg font-black text-primary-900 uppercase tracking-tighter mb-8">Faturamento por Segmento</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={salesBySegment}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={10}
                        dataKey="value"
                     >
                        {salesBySegment.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
               {salesBySegment.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                        <span className="text-[10px] font-black text-primary-900 uppercase tracking-tighter">{s.name}</span>
                     </div>
                     <span className="text-[10px] font-black text-technical uppercase tracking-tighter">R$ {(s.value / 1000).toFixed(0)}k</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div className="jrl-card overflow-hidden">
         <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-primary-900 uppercase tracking-tighter">Top Performers (Vendedores)</h3>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-technical" size={14} />
               <input 
                  type="text" 
                  placeholder="Filtrar equipe..."
                  className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-900" 
               />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50">
                     <th className="px-8 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Colaborador</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase text-technical tracking-widest">Contas Ativas</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase text-technical tracking-widest text-center">Ticket Médio</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase text-technical tracking-widest text-right">Faturamento Total</th>
                  </tr>
               </thead>
               <tbody>
                  {[
                     { name: 'Ricardo Sales', accounts: 42, ticket: 15400, total: 646800 },
                     { name: 'Ana Souza', accounts: 38, ticket: 12200, total: 463600 },
                     { name: 'Carlos Lima', accounts: 29, ticket: 11500, total: 333500 },
                  ].map((row, i) => (
                     <tr key={i} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-primary-900 text-sm">{row.name}</td>
                        <td className="px-8 py-5 text-sm font-medium text-slate-600">{row.accounts} empresas</td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-700 text-center">R$ {row.ticket.toLocaleString('pt-BR')}</td>
                        <td className="px-8 py-5 text-sm font-black text-primary-900 text-right">R$ {row.total.toLocaleString('pt-BR')}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
