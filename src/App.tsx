import React, { useState, useEffect, Suspense } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import CompaniesView from './components/CompaniesView';
import PipelineView from './components/PipelineView';
import AccountPanel from './components/AccountPanel';
import { seedInitialData } from './lib/seed';
import { Company, UserProfile } from './types';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Ticket, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  Building2,
  Phone,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Components ---
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (email === 'diretoria@jrlchemicals.com.br') {
          const { setupAdminProfile } = await import('./lib/seed');
          await setupAdminProfile(userCredential.user.uid, email);
        }
      } else {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o ou use o Google Login abaixo.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Credenciais inválidas ou erro de permissão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      if (userCredential.user.email === 'diretoria@jrlchemicals.com.br' || userCredential.user.email === 'ladeiracaue@gmail.com') {
        const { setupAdminProfile } = await import('./lib/seed');
        await setupAdminProfile(userCredential.user.uid, userCredential.user.email!);
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha no login com Google. Verifique se os pop-ups estão permitidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-900 p-3 rounded-xl">
              <Layers className="text-gold w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary-900">JRL Sales Command System</h1>
          <p className="text-technical text-sm mt-1">
            {isRegistering ? 'Crie seu acesso de administrador' : 'Bem-vindo ao centro de comando JRL Chemicals'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-800 outline-none transition-all"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-800 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
          <button 
            disabled={loading}
            className="w-full jrl-btn-primary py-3 mt-4"
          >
            {loading ? 'Processando...' : isRegistering ? 'Criar Conta Master' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs">Ou</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full jrl-btn-secondary py-3 mt-2 flex items-center justify-center gap-2 border-gray-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-primary-800 hover:underline font-medium"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Primeiro acesso? Registre-se como Admin'}
          </button>
          <p className="text-[10px] text-technical mt-8">JRL Chemicals | Inteligência, Relacionamento e Resultado.</p>
        </div>
      </motion.div>
    </div>
  );
}

// --- Sidebar Item ---
function SidebarItem({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
        active ? "bg-primary-800 text-white shadow-md" : "text-gray-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={active ? "text-gold" : "group-hover:text-gold transition-colors"} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge && (
        <span className="bg-gold text-primary-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

// --- Main App Logic ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const d = await getDoc(docRef);
        if (d.exists()) {
          const prof = d.data() as UserProfile;
          setProfile(prof);
        } else if (u.email === 'diretoria@jrlchemicals.com.br') {
          // Auto-setup for the director if requested in prompt
          const { setupAdminProfile } = await import('./lib/seed');
          await setupAdminProfile(u.uid, u.email!);
          const d2 = await getDoc(docRef);
          setProfile(d2.data() as UserProfile);
        }
        setUser(u);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSeed = async () => {
    if (user && profile) {
      await seedInitialData(user.uid, profile.name);
      alert('Dados iniciais carregados!');
    }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><Clock className="animate-spin text-primary-900" /></div>;

  if (!user) return <Login />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'companies', label: 'Carteira de Clientes', icon: Building2 },
    { id: 'pipeline', label: 'Pipeline de Vendas', icon: Briefcase },
    { id: 'proposals', label: 'Propostas', icon: TrendingUp },
    { id: 'tickets', label: 'Tickets & Orientações', icon: Ticket, badge: 3 },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'team', label: 'Gestão de Equipe', icon: Users, hidden: profile?.role !== 'admin' && profile?.role !== 'manager' },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-primary-900 flex-shrink-0 transition-all border-r border-slate-800 z-50",
        sidebarOpen ? "w-72" : "w-0 md:w-20 overflow-hidden"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
             <div className="bg-white/10 p-2 rounded-lg">
                <Layers className="text-gold w-6 h-6" />
             </div>
             {sidebarOpen && <span className="text-white font-bold text-lg whitespace-nowrap">JRL Command</span>}
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {tabs.filter(t => !t.hidden).map((tab) => (
              <SidebarItem 
                key={tab.id}
                icon={tab.icon}
                label={sidebarOpen ? tab.label : ''}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                badge={tab.badge}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                {profile?.name.charAt(0)}
              </div>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-white text-sm font-semibold truncate">{profile?.name}</p>
                  <p className="text-gray-400 text-xs capitalize">{profile?.role}</p>
                </div>
              )}
            </div>
            {profile?.role === 'admin' && (
              <button onClick={handleSeed} className="w-full text-[10px] text-gold/60 mb-2 hover:text-gold text-left px-4">Seed Initial Data</button>
            )}
            <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="font-medium text-sm">Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all relative overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-slate-500"
            >
              {sidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 w-80">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar empresa, CNPJ ou produto..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 text-slate-500 hover:bg-gray-100 rounded-full transition-all">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-primary-900">{profile?.name}</p>
              <p className="text-xs text-technical capitalize">{profile?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold">
              {profile?.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            <Suspense fallback={<div className="h-64 flex items-center justify-center">Carregando...</div>}>
              {activeTab === 'dashboard' && <DashboardView profile={profile!} />}
              {activeTab === 'companies' && <CompaniesView profile={profile!} onOpenAccount={setSelectedCompany} />}
              {activeTab === 'pipeline' && <PipelineView profile={profile!} onOpenAccount={setSelectedCompany} />}
              {activeTab === 'proposals' && <ProposalsView profile={profile!} />}
            </Suspense>
          </div>
        </div>

        <AnimatePresence>
          {selectedCompany && (
            <AccountPanel 
              company={selectedCompany} 
              profile={profile!} 
              onClose={() => setSelectedCompany(null)} 
            />
          )}
        </AnimatePresence>
        
        {/* Footer */}
        <footer className="p-4 text-center shrink-0 border-t border-gray-100 bg-white">
           <p className="text-xs text-technical">JRL Chemicals | Inteligência, Relacionamento e Resultado.</p>
        </footer>
      </main>
    </div>
  );
}

// --- Views ---
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer 
} from 'recharts';

const chartData = [
  { name: 'Jan', total: 4000 },
  { name: 'Fev', total: 3000 },
  { name: 'Mar', total: 5000 },
  { name: 'Abr', total: 2780 },
  { name: 'Mai', total: 1890 },
  { name: 'Jun', total: 2390 },
];

function DashboardView({ profile }: { profile: UserProfile }) {
  const kpis = [
    { label: 'Contas Ativas', value: '142', trend: '+12%', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Propostas Abertas', value: 'R$ 2.4M', trend: '+5.4%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Follow-ups Hoje', value: '18', trend: 'Prioridade', icon: Clock, color: 'text-gold', bg: 'bg-orange-50' },
    { label: 'Atrasados', value: '4', trend: 'Atenção', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bom dia, {profile.name}</h2>
          <p className="text-technical text-sm">Aqui está o resumo da sua operação comercial hoje.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="jrl-card p-6 flex items-start justify-between"
          >
            <div>
              <p className="text-technical text-[10px] font-bold uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
              <p className={cn("text-xs mt-2 font-medium", kpi.color)}>{kpi.trend}</p>
            </div>
            <div className={cn("p-3 rounded-xl", kpi.bg)}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 jrl-card p-6 min-h-[400px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Evolução de Vendas</h3>
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6C7A89' }} />
                  <YAxis hide />
                  <ReTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0E2A47" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
        
        <div className="jrl-card p-6">
           <h3 className="font-bold text-lg mb-6">Alerta do Gestor</h3>
           <div className="space-y-4">
              {[1, 2].map((_, i) => (
                <div key={i} className="bg-primary-900 text-white p-4 rounded-2xl relative overflow-hidden">
                   <AlertTriangle className="absolute -right-2 -bottom-2 text-white/10 w-16 h-16" />
                   <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Urgente</p>
                   <h5 className="font-bold text-sm mb-2">Entrar via PAC na Cadam</h5>
                   <p className="text-xs text-white/70">O comprador está aguardando orçamento de PAC para fechar o mês.</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function ProposalsView({ profile }: { profile: UserProfile }) {
  return <div className="h-96 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl font-bold">Módulo de Propostas JRL Chemicals</div>;
}
