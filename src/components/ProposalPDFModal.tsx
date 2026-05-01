import React, { useEffect, useState } from 'react';
import { Proposal, ProposalItem, Company, Branch, Contact, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { X, Printer, Download, MapPin, Phone, Globe, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ProposalPDFModalProps {
  proposal: Proposal;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProposalPDFModal({ proposal, isOpen, onClose }: ProposalPDFModalProps) {
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [itemsSnap, compSnap] = await Promise.all([
            getDocs(collection(db, 'proposals', proposal.id, 'items')),
            getDoc(doc(db, 'companies', proposal.companyId))
          ]);
          
          setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProposalItem)));
          if (compSnap.exists()) setCompany({ id: compSnap.id, ...compSnap.data() } as Company);
          
          if (proposal.branchId) {
            const bSnap = await getDoc(doc(db, 'companies', proposal.companyId, 'branches', proposal.branchId));
            if (bSnap.exists()) setBranch({ id: bSnap.id, ...bSnap.data() } as Branch);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, proposal]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 md:p-8 overflow-hidden print:p-0 print:bg-white print:relative print:z-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden print:shadow-none print:h-auto print:static"
          >
            {/* Modal Actions - Hidden on print */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 print:hidden">
              <div className="flex items-center gap-4">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-gold rounded-lg font-bold text-xs uppercase tracking-widest">
                  <Printer size={16} /> Imprimir
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-300">
                  <Download size={16} /> Baixar PDF
                </button>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-y-auto p-12 bg-white print:overflow-visible print:p-0" id="proposal-content">
               <div className="max-w-[210mm] mx-auto min-h-[297mm] bg-white text-slate-900 font-sans">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-4 border-primary-900 pb-8 mb-12">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                           <div className="bg-primary-900 text-gold w-10 h-10 flex items-center justify-center rounded-lg font-black text-2xl">J</div>
                           <h1 className="text-2xl font-black text-primary-900 tracking-tighter">JRL CHEMICALS</h1>
                        </div>
                        <p className="text-[10px] font-bold text-technical uppercase tracking-[0.3em]">Produtos Químicos Industriais</p>
                        <div className="mt-4 space-y-1 text-xs text-technical">
                           <p className="flex items-center gap-1"><Globe size={10} /> jrlchemicals.com.br</p>
                           <p className="flex items-center gap-1"><Mail size={10} /> comercial@jrlchemicals.com.br</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="bg-primary-900 text-white px-6 py-2 rounded-bl-2xl mb-4">
                           <h2 className="text-sm font-black uppercase tracking-widest">Proposta Comercial</h2>
                        </div>
                        <p className="text-xl font-black text-primary-900 leading-none">#{proposal.number}</p>
                        <p className="text-[10px] font-bold text-technical mt-1 italic">Emitida em {proposal.date ? format(proposal.date.toDate(), 'dd/MM/yyyy') : '--/--/----'}</p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">Válida até: {proposal.validUntil ? format(proposal.validUntil.toDate(), 'dd/MM/yyyy') : '--/--/----'}</p>
                     </div>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-12 mb-12">
                     <div>
                        <h3 className="text-[10px] font-black uppercase text-primary-900 tracking-widest border-b border-gray-200 mb-4 pb-1">Dados do Cliente</h3>
                        <p className="font-black text-sm uppercase text-slate-800">{company?.razaoSocial}</p>
                        <p className="text-xs text-slate-600 mt-1">CNPJ: {company?.cnpj}</p>
                        <div className="mt-4 text-xs text-slate-500 space-y-1">
                           <p className="flex items-start gap-2 max-w-xs">
                              <MapPin size={14} className="shrink-0 text-gold mt-0.5" />
                              {company?.endereco}, {company?.numero} - {company?.bairro}<br />
                              {company?.cidade}/{company?.uf} - CEP: {company?.cep}
                           </p>
                        </div>
                     </div>
                     {branch && (
                       <div>
                          <h3 className="text-[10px] font-black uppercase text-primary-900 tracking-widest border-b border-gray-200 mb-4 pb-1">Unidade de Entrega</h3>
                          <p className="font-bold text-xs uppercase text-slate-700">{branch.nomeUnidade}</p>
                          <p className="text-[10px] text-slate-500 mt-1">CNPJ: {branch.cnpj}</p>
                          <div className="mt-4 text-xs text-slate-500 space-y-1">
                             <p className="flex items-start gap-2 max-w-xs">
                                <MapPin size={14} className="shrink-0 text-gold mt-0.5" />
                                {branch.endereco}, {branch.numero}<br />
                                {branch.cidade}/{branch.uf}
                             </p>
                          </div>
                       </div>
                     )}
                  </div>

                  {/* Table of Items */}
                  <div className="mb-12">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-primary-900 text-gold text-[10px] font-black uppercase tracking-widest">
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3">Família</th>
                              <th className="px-4 py-3">Embalagem</th>
                              <th className="px-4 py-3 text-center">Volume</th>
                              <th className="px-4 py-3 text-right">Preço Unit.</th>
                              <th className="px-4 py-3 text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="text-xs">
                           {items.map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                 <td className="px-4 py-4 font-black border-b border-gray-100">{item.productName}</td>
                                 <td className="px-4 py-4 text-slate-500 border-b border-gray-100 italic">{item.productFamily || '---'}</td>
                                 <td className="px-4 py-4 border-b border-gray-100">{item.packageType}</td>
                                 <td className="px-4 py-4 text-center border-b border-gray-100 font-bold">{item.volume} {item.unit}</td>
                                 <td className="px-4 py-4 text-right border-b border-gray-100">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                                 <td className="px-4 py-4 text-right font-black border-b border-gray-100">R$ {item.itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Summary and Terms */}
                  <div className="grid grid-cols-2 gap-12 mb-12">
                     <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                        <h3 className="text-[10px] font-black uppercase text-primary-900 tracking-widest mb-4">Condições Comerciais</h3>
                        <div className="space-y-3">
                           <div>
                              <p className="text-[9px] font-black text-technical uppercase">Condição de Pagamento</p>
                              <p className="text-xs font-bold text-slate-800">{proposal.paymentTerms || 'A combinar'}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-technical uppercase">Prazo de Entrega</p>
                              <p className="text-xs font-bold text-slate-800">{proposal.deliveryTime || 'A combinar'}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-technical uppercase">Tipo de Frete</p>
                              <p className="text-xs font-bold text-slate-800">{items[0]?.freightType || 'CIF'}</p>
                           </div>
                        </div>
                        {proposal.observations && (
                          <div className="mt-6 border-t border-gray-200 pt-4">
                             <p className="text-[9px] font-black text-technical uppercase mb-1">Notas Adicionais</p>
                             <p className="text-[10px] text-slate-600 leading-relaxed italic">{proposal.observations}</p>
                          </div>
                        )}
                     </div>

                     <div className="flex flex-col justify-between">
                        <div className="space-y-3 bg-primary-900 text-white p-8 rounded-3xl shadow-xl">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                              <span>Total Produtos</span>
                              <span>R$ {proposal.totalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                              <span>Impostos / Taxas</span>
                              <span>R$ {proposal.totalTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                              <span>Entrega / Frete</span>
                              <span>R$ {proposal.totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="h-px bg-white/10 my-2" />
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gold">Valor Líquido Total</span>
                              <span className="text-3xl font-black text-gold leading-none tracking-tighter">
                                 R$ {proposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </div>

                        <div className="mt-auto text-center">
                           <div className="border-t border-slate-300 pt-2 mx-12">
                              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">{proposal.userName}</p>
                              <p className="text-[8px] font-black text-technical uppercase tracking-[0.2em]">Consultor Técnico JRL</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-20 text-center border-t border-gray-100 pt-8 opacity-40 grayscale">
                     <p className="text-[10px] font-black text-primary-900 uppercase tracking-[0.5em] mb-2">JRL QUÍMICOS</p>
                     <p className="text-[9px] font-bold text-technical">Inteligência, Relacionamento e Resultado.</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
