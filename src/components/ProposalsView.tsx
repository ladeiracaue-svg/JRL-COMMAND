import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Printer, 
  Building2,
  Copy,
  ExternalLink,
  MessageSquare,
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Proposal, UserProfile, ProposalStatus } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logAudit } from '../lib/auditService';
import { getBaseQuery } from '../lib/permissions';
import { useTeam } from '../lib/useTeam';
import ProposalDrawer from './ProposalDrawer';
import ProposalPDFModal from './ProposalPDFModal';
import { getStatusColor } from '../services/proposalService';

interface ProposalsViewProps {
  profile: UserProfile;
}

export default function ProposalsView({ profile }: ProposalsViewProps) {
  const { teamIds, loading: loadingTeam } = useTeam(profile);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [proposalToEdit, setProposalToEdit] = useState<Proposal | undefined>();
  const [duplicateFrom, setDuplicateFrom] = useState<Proposal | undefined>();

  useEffect(() => {
    if (loadingTeam) return;
    const q = getBaseQuery(collection(db, 'proposals'), profile, teamIds);

    const unsub = onSnapshot(q, (snap) => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'proposals');
      setLoading(false);
    });

    return unsub;
  }, [profile, teamIds, loadingTeam]);

  const handleUpdateStatus = async (proposal: Proposal, newStatus: ProposalStatus, extra: any = {}) => {
    try {
      const docRef = doc(db, 'proposals', proposal.id);
      const updateData: any = { 
        status: newStatus, 
        updatedAt: serverTimestamp(),
        ...extra
      };
      
      if (newStatus === 'Enviada') updateData.sentAt = serverTimestamp();
      if (newStatus === 'Fechada ganha') updateData.wonAt = serverTimestamp();
      if (newStatus === 'Fechada perdida') updateData.lostAt = serverTimestamp();

      await updateDoc(docRef, updateData);
      await logAudit(profile.uid, profile.name, 'proposal', proposal.id, `Status alterado: ${proposal.status} -> ${newStatus}`);
      
      // Interaction log
      await addDoc(collection(db, 'companies', proposal.companyId, 'interactions'), {
        userId: profile.uid,
        userName: profile.name,
        companyId: proposal.companyId,
        type: 'status_change',
        description: `Proposta ${proposal.number} alterada para ${newStatus}`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proposals');
    }
  };

  const copyWhatsAppMessage = (proposal: Proposal) => {
    const validUntilStr = proposal.validUntil ? format(proposal.validUntil.toDate(), 'dd/MM/yyyy') : 'N/A';
    const message = `Olá, tudo bem? Conforme conversamos, estou te encaminhando a proposta da JRL Chemicals referente à sua solicitação. A proposta contempla ${proposal.paymentTerms}, validade até ${validUntilStr}. Fico à disposição para alinharmos prazo, volume ou qualquer ajuste necessário.`;
    navigator.clipboard.writeText(message);
    alert('Mensagem copiada para o clipboard!');
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = 
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canEdit = (status: ProposalStatus) => {
    return ['Rascunho', 'Em elaboração', 'Enviada', 'Em negociação'].includes(status);
  };

  const openPDF = (p: Proposal) => {
    setSelectedProposal(p);
    setPdfModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary-900 tracking-tighter uppercase">Propostas Comerciais</h2>
          <p className="text-technical text-xs font-medium italic opacity-60">Sprint 3 — JRL Command Command Center</p>
        </div>
        <button 
          onClick={() => {
            setProposalToEdit(undefined);
            setDuplicateFrom(undefined);
            setDrawerOpen(true);
          }}
          className="jrl-btn-primary px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-primary-900/40"
        >
          <Plus size={18} strokeWidth={3} /> Gerar Orçamento
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-technical" size={18} />
          <input 
            type="text" 
            placeholder="Nº Proposta, Cliente ou Vendedor..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-900 transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-technical" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-900 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos Status</option>
            <option value="Rascunho">Rascunho</option>
            <option value="Enviada">Enviada</option>
            <option value="Em negociação">Negociação</option>
            <option value="Fechada ganha">Ganha</option>
            <option value="Fechada perdida">Perdida</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest">Nº / Data</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest">Empresa</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest">Responsável</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest">Valor Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-technical tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50/80 transition-all cursor-pointer group">
                  <td className="px-8 py-5" onClick={() => {
                     setProposalToEdit(p);
                     setDuplicateFrom(undefined);
                     setDrawerOpen(true);
                  }}>
                    <p className="text-sm font-black text-primary-900 tracking-tighter">#{p.number}</p>
                    <p className="text-[10px] font-bold text-technical uppercase border-l-2 border-gold pl-2 ml-1 mt-1">
                       {p.date ? format(p.date.toDate(), 'dd/MM/yy') : '--/--/--'}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.companyName}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <Clock size={10} className="text-technical" />
                       <p className="text-[9px] font-black uppercase text-technical tracking-widest">Val: {p.validUntil ? format(p.validUntil.toDate(), 'dd/MM/yy') : 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-primary-900">
                          {p.userName.charAt(0)}
                       </div>
                       <p className="text-xs font-bold text-slate-600">{p.userName}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-primary-900">
                       R$ {p.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         title="Copiar WhatsApp"
                         onClick={(e) => { e.stopPropagation(); copyWhatsAppMessage(p); }}
                         className="p-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                       >
                         <MessageSquare size={18} />
                       </button>
                       <button 
                         title="Imprimir / PDF"
                         onClick={(e) => { e.stopPropagation(); openPDF(p); }}
                         className="p-2.5 hover:bg-primary-50 text-primary-900 rounded-xl transition-all"
                       >
                         <Printer size={18} />
                       </button>
                       <button 
                         title="Duplicar"
                         onClick={(e) => {
                           e.stopPropagation();
                           setDuplicateFrom(p);
                           setProposalToEdit(undefined);
                           setDrawerOpen(true);
                         }}
                         className="p-2.5 hover:bg-amber-50 text-amber-600 rounded-xl transition-all"
                       >
                         <Copy size={18} />
                       </button>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (canEdit(p.status)) {
                             setProposalToEdit(p);
                             setDuplicateFrom(undefined);
                             setDrawerOpen(true);
                           }
                         }}
                         className="p-2.5 hover:bg-gray-100 text-slate-600 rounded-xl transition-all"
                       >
                         <ChevronRight size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProposals.length === 0 && (
            <div className="py-24 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <FileText size={32} className="text-gray-200" />
              </div>
              <h4 className="text-lg font-black text-primary-900 uppercase tracking-tighter">Nenhum Orçamento</h4>
              <p className="text-technical text-xs font-medium max-w-xs mx-auto mt-2">Não encontramos propostas para os filtros aplicados no momento.</p>
            </div>
          )}
        </div>
      )}

      <ProposalDrawer 
        profile={profile}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => setDrawerOpen(false)}
        proposalToEdit={proposalToEdit}
        duplicateFrom={duplicateFrom}
      />

      {selectedProposal && (
        <ProposalPDFModal 
          proposal={selectedProposal}
          isOpen={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false);
            setSelectedProposal(null);
          }}
        />
      )}
    </div>
  );
}
