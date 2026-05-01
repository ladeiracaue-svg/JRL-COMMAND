import React, { useState, useEffect, Suspense } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import CompaniesView from './components/CompaniesView';
import PipelineView from './components/PipelineView';
import ProposalsView from './components/ProposalsView';
import TicketsView from './components/TicketsView';
import TeamView from './components/TeamView';
import AccountPanel from './components/AccountPanel';
import AuditLogView from './components/AuditLogView';
import DashboardView from './components/DashboardView';
import ReportsView from './components/ReportsView';
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
function Login({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha não está ativado no Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Falha na autenticação. Verifique sua conexão.');
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
      
      const docRef = doc(db, 'users', userCredential.user.uid);
      const d = await getDoc(docRef);
      
      if (!d.exists() && userCredential.user.email !== 'diretoria@jrlchemicals.com.br' && userCredential.user.email !== 'ladeiracaue@gmail.com') {
        await auth.signOut();
        onUnauthorized();
        return;
      }

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
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-900 p-4 rounded-2xl shadow-lg ring-4 ring-gold/20">
              <Layers className="text-gold w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-primary-900 tracking-tighter uppercase mb-2">JRL COMMAND</h1>
          <p className="text-technical text-xs font-bold uppercase tracking-widest bg-gray-50 py-1.5 px-4 rounded-full inline-block">
             Gestão de Elite JRL Chemicals
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-technical uppercase tracking-wider ml-1">E-mail Corporativo</label>
            <input 
              type="email" 
              required
              className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-900 focus:border-transparent outline-none transition-all font-bold text-sm"
              placeholder="vendedor@jrlchemicals.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-technical uppercase tracking-wider ml-1">Senha de Acesso</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-900 focus:border-transparent outline-none transition-all font-bold text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="bg-red-50 text-red-600 p-3 rounded-xl text-[10px] font-black uppercase text-center border border-red-100">{error}</p>}
          <button 
            disabled={loading}
            className="w-full jrl-btn-primary py-4 mt-6 text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            {loading ? 'Validando Credenciais...' : 'Entrar no Comando'}
            <ChevronRight size={18} />
          </button>
        </form>

        <div className="mt-8">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-technical font-black text-[10px] uppercase tracking-widest">Painel de Acesso</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-100 hover:border-primary-900 hover:text-primary-900 py-4 mt-6 flex items-center justify-center gap-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Acesso via Google Workspace
          </button>
        </div>
        
        <div className="mt-10 text-center opacity-40">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-technical">
            JRL Chemicals v4.0 • Enterprise Security Layer
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Unauthorized({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center"
      >
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-primary-900 uppercase tracking-tighter mb-4">Acesso não autorizado</h2>
        <p className="text-technical text-sm font-medium mb-8">
          Sua conta não possui um perfil ativo no JRL COMMAND. 
          Entre em contato com a diretoria para solicitar seu convite e permissões de acesso.
        </p>
        <button 
          onClick={onBack}
          className="jrl-btn-primary w-full py-4 text-xs font-black uppercase tracking-widest"
        >
          Voltar para Login
        </button>
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
  const [unauthorized, setUnauthorized] = useState(false);
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
          if (!prof.active && prof.role !== 'admin') {
            setUnauthorized(true);
            setUser(null);
            auth.signOut();
          } else {
            setProfile(prof);
            setUser(u);
            setUnauthorized(false);
          }
        } else if (u.email === 'diretoria@jrlchemicals.com.br' || u.email === 'ladeiracaue@gmail.com') {
          const { setupAdminProfile } = await import('./lib/seed');
          await setupAdminProfile(u.uid, u.email!);
          const d2 = await getDoc(docRef);
          setProfile(d2.data() as UserProfile);
          setUser(u);
          setUnauthorized(false);
        } else {
          // No profile found and not a bootstrap admin
          setUnauthorized(true);
          setUser(null);
          auth.signOut();
        }
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
      const { seedInitialData } = await import('./lib/seed');
      await seedInitialData(user.uid, profile.name);
      alert('Dados iniciais carregados!');
    }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><Clock className="animate-spin text-primary-900" /></div>;

  if (unauthorized) return <Unauthorized onBack={() => setUnauthorized(false)} />;

  if (!user) return <Login onUnauthorized={() => setUnauthorized(true)} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'companies', label: 'Carteira de Clientes', icon: Building2 },
    { id: 'pipeline', label: 'Pipeline de Vendas', icon: Briefcase },
    { id: 'proposals', label: 'Propostas', icon: TrendingUp },
    { id: 'tickets', label: 'Tickets & Orientações', icon: Ticket, badge: 3 },
    { id: 'audit', label: 'Audit Log', icon: Clock, hidden: profile?.role !== 'admin' },
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
              {activeTab === 'tickets' && <TicketsView profile={profile!} />}
              {activeTab === 'audit' && <AuditLogView />}
              {activeTab === 'team' && <TeamView profile={profile!} />}
              {activeTab === 'reports' && <ReportsView profile={profile!} />}
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

// --- Views are imported above ---
