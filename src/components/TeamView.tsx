import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeamView({ profile }: { profile: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });
    return unsub;
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'seller' as const,
    commissionRateDefault: 5
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      // In a real app, you might use Firebase Admin or a cloud function to create the auth user.
      // Here we create the profile; the user will log in via Google/Email with this email.
      // We use the email as a temporary ID prefix or just let them sign in and match email.
      // The rules will handle the creation because admins are allowed.
      
      const userId = newUser.email.replace(/[@.]/g, '_'); // Temporary ID or handle via email matching logic
      
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert('Usuário convidado! Oriente-o a entrar com o e-mail: ' + newUser.email);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { active: !user.active });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Equipe</h2>
          <p className="text-technical text-sm">Controle acesso, papéis e performance da sua força comercial.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="jrl-btn-primary"><UserPlus size={18} /> Convidar Integrante</button>
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
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
               <h3 className="text-xl font-bold text-primary-900 mb-6">Convidar Integrante</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                 <div>
                   <label className="block text-[10px] uppercase font-black text-technical mb-1">Nome Completo</label>
                   <input 
                     type="text" 
                     required
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl"
                     value={newUser.name}
                     onChange={e => setNewUser({...newUser, name: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-black text-technical mb-1">E-mail Corporativo</label>
                   <input 
                     type="email" 
                     required
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl"
                     value={newUser.email}
                     onChange={e => setNewUser({...newUser, email: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-black text-technical mb-1">Perfil de Acesso</label>
                   <select 
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl"
                     value={newUser.role}
                     onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                   >
                     <option value="seller">Vendedor</option>
                     <option value="manager">Gestor Comercial</option>
                     <option value="admin">Administrador / Diretoria</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-black text-technical mb-1">Comissão Padrão (%)</label>
                   <input 
                     type="number" 
                     required
                     className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl"
                     value={newUser.commissionRateDefault}
                     onChange={e => setNewUser({...newUser, commissionRateDefault: Number(e.target.value)})}
                   />
                 </div>
                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-100 rounded-xl text-xs font-bold uppercase">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-primary-900 text-white rounded-xl text-xs font-bold uppercase">Criar Perfil</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <motion.div 
            key={u.uid}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="jrl-card p-6"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-900 text-white flex items-center justify-center font-bold text-lg">
                {u.name.charAt(0)}
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {u.active ? 'Ativo' : 'Inativo'}
              </div>
            </div>

            <h3 className="font-bold text-slate-900 text-lg mb-1">{u.name}</h3>
            <div className="flex items-center gap-2 text-xs text-technical mb-6">
               <Shield size={14} className="text-gold" />
               <span className="capitalize">{u.role}</span>
               <span className="text-gray-300">•</span>
               <Mail size={14} />
               <span className="truncate">{u.email}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase text-technical font-bold mb-1">Comissão</p>
                  <p className="text-sm font-bold text-primary-900">{u.commissionRateDefault}%</p>
               </div>
               <div className="p-3 bg-primary-900/5 rounded-xl border border-primary-900/5">
                  <p className="text-[10px] uppercase text-technical font-bold mb-1">Impacto</p>
                  <p className="text-sm font-bold text-primary-900">Alto</p>
               </div>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => toggleStatus(u)}
                 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                   u.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                 }`}
               >
                 {u.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                 {u.active ? 'Suspender' : 'Ativar'}
               </button>
               <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 transition-all">
                  <Briefcase size={14} /> Vínculos
               </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
