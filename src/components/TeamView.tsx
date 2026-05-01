import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, addDoc, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAudit } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Briefcase,
  X,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeamView({ profile }: { profile: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(allUsers);
      setManagers(allUsers.filter(u => u.role === 'manager' || u.role === 'admin'));
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
    phone: '',
    role: 'seller' as UserRole,
    managerId: '',
    commissionRateDefault: 5
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a production environment with email/password, you'd use a Cloud Function
      // calling admin.auth().createUser(). Here we simulate by creating the profile.
      // The user will enter with this email. We mark mustChangePassword = true.
      
      // For this demo environment, we use email as part of the ID or just a generated ID.
      // Since they might sign in with Google or local auth, matching by email is key if using set_up_firebase.
      // But here we need a UID for the doc. We'll use a random ID or email-based.
      
      const userId = newUser.email.replace(/[@.]/g, '_');
      
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        uid: userId,
        active: true,
        mustChangePassword: true,
        commissionEnabled: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await logAudit(
        profile.uid, 
        profile.name, 
        'user', 
        userId, 
        `Usuário criado por ${profile.name}`, 
        null, 
        { ...newUser, active: true, mustChangePassword: true }
      );
      
      alert('Perfil de usuário criado! E-mail: ' + newUser.email + '. Acesso por Google ou E-mail liberado.');
      setIsModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        role: 'seller',
        managerId: '',
        commissionRateDefault: 5
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { active: !user.active });
      await logAudit(
        profile.uid, 
        profile.name, 
        'user', 
        user.uid, 
        `Status alterado para ${!user.active ? 'Ativo' : 'Inativo'}`, 
        { active: user.active }, 
        { active: !user.active }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const changeUserRole = async (user: UserProfile, newRole: UserRole) => {
    if (user.role === newRole) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { role: newRole });
      await logAudit(
        profile.uid, 
        profile.name, 
        'user', 
        user.uid, 
        `Role alterada de ${user.role} para ${newRole}`, 
        { role: user.role }, 
        { role: newRole }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 uppercase tracking-tighter">Usuários & Permissões</h2>
          <p className="text-technical text-sm font-medium">Controle o acesso e papéis da força comercial JRL.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="jrl-btn-primary flex items-center gap-2">
          <UserPlus size={18} /> 
          Convidar Integrante
        </button>
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
               className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
               <div className="bg-primary-900 p-6 flex items-center justify-between text-white">
                  <div>
                    <h3 className="text-xl font-bold">Novo Integrante</h3>
                    <p className="text-white/60 text-xs">Acesso restrito ao comando JRL</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X size={20} />
                  </button>
               </div>
               
               <form onSubmit={handleCreateUser} className="p-8 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-[10px] uppercase font-black text-technical mb-1">Nome Completo</label>
                       <input 
                         type="text" 
                         required
                         className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                         value={newUser.name}
                         onChange={e => setNewUser({...newUser, name: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] uppercase font-black text-technical mb-1">E-mail</label>
                       <input 
                         type="email" 
                         required
                         className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                         value={newUser.email}
                         onChange={e => setNewUser({...newUser, email: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] uppercase font-black text-technical mb-1">Telefone</label>
                       <input 
                         type="tel" 
                         className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                         value={newUser.phone}
                         onChange={e => setNewUser({...newUser, phone: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] uppercase font-black text-technical mb-1">Nível de Acesso</label>
                       <select 
                         className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                         value={newUser.role}
                         onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                       >
                         <option value="seller">Vendedor</option>
                         <option value="manager">Gestor Comercial</option>
                         <option value="admin">Administrador</option>
                       </select>
                    </div>
                    {newUser.role === 'seller' && (
                       <div>
                          <label className="block text-[10px] uppercase font-black text-technical mb-1">Gestor (Manager)</label>
                          <select 
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                            value={newUser.managerId}
                            onChange={e => setNewUser({...newUser, managerId: e.target.value})}
                          >
                            <option value="">Selecione...</option>
                            {managers.map(m => (
                               <option key={m.uid} value={m.uid}>{m.name}</option>
                            ))}
                          </select>
                       </div>
                    )}
                    <div className={newUser.role === 'seller' ? '' : 'col-span-1'}>
                       <label className="block text-[10px] uppercase font-black text-technical mb-1">Comissão Padrão (%)</label>
                       <input 
                         type="number" 
                         step="0.1"
                         required
                         className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                         value={newUser.commissionRateDefault}
                         onChange={e => setNewUser({...newUser, commissionRateDefault: Number(e.target.value)})}
                       />
                    </div>
                 </div>

                 <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 text-orange-700">
                    <Lock size={18} className="shrink-0" />
                    <div>
                       <h5 className="text-[10px] font-black uppercase mb-1">Segurança de Acesso</h5>
                       <p className="text-[10px] font-medium leading-relaxed">Usuário terá acesso liberado e será obrigado a definir uma nova senha no primeiro acesso.</p>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-3 font-black text-[10px] uppercase tracking-widest">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl text-slate-500 hover:bg-gray-50 transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-primary-900 text-gold rounded-2xl hover:bg-gold hover:text-primary-900 transition-all shadow-xl">Criar Perfil JRL</button>
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
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`jrl-card p-6 border-b-4 ${
              u.active ? 'border-b-emerald-500' : 'border-b-red-500'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-900 text-white flex items-center justify-center font-black text-lg">
                {u.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  u.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {u.active ? 'Ativo' : 'Inativo'}
                </div>
                {u.mustChangePassword && (
                   <span className="text-[9px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full uppercase">Senha Pendente</span>
                )}
              </div>
            </div>

            <h3 className="font-black text-primary-900 text-lg mb-1 tracking-tighter">{u.name}</h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-technical">
                 <Shield size={14} className="text-gold" />
                 <span className="capitalize">{u.role}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-technical">
                 <Mail size={14} className="text-gray-400" />
                 <span className="truncate">{u.email}</span>
              </div>
              {u.managerId && (
                <div className="flex items-center gap-2 text-xs font-medium text-technical">
                   <Users size={14} className="text-blue-400" />
                   <span>Gestor: {users.find(um => um.uid === u.managerId)?.name || 'Desconectado'}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
               <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] uppercase text-technical font-black mb-1">Comissão</p>
                  <p className="text-xs font-black text-primary-900">{u.commissionRateDefault}%</p>
               </div>
               <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] uppercase text-technical font-black mb-1">Login</p>
                  <p className="text-xs font-black text-primary-900">Workspace</p>
               </div>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => toggleStatus(u)}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                   u.active ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                 }`}
               >
                 {u.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                 {u.active ? 'Bloquear' : 'Ativar'}
               </button>
               
               <div className="relative group/role">
                  <button className="h-full px-4 bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 rounded-2xl transition-all">
                    <Shield size={14} />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-40 bg-white shadow-2xl rounded-2xl p-2 hidden group-hover/role:block z-10 border border-gray-100">
                     <p className="text-[10px] font-black uppercase text-technical p-2 border-b mb-2">Alterar Role:</p>
                     {(['admin', 'manager', 'seller'] as UserRole[]).map(r => (
                        <button 
                          key={r}
                          onClick={() => changeUserRole(u, r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold capitalize hover:bg-gray-50 ${u.role === r ? 'text-primary-900 bg-slate-50' : 'text-slate-500'}`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
