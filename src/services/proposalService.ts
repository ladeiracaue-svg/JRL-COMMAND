import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { Proposal, ProposalStatus } from '../types';

export const getNextProposalNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const q = query(
    collection(db, 'proposals'),
    orderBy('number', 'desc'),
    limit(1)
  );

  const snap = await getDocs(q);
  let nextSeq = 1;

  if (!snap.empty) {
    const lastNum = snap.docs[0].data().number as string;
    if (lastNum.startsWith(`JRL-${currentYear}-`)) {
      const lastSeq = parseInt(lastNum.split('-')[2]);
      nextSeq = lastSeq + 1;
    }
  }

  return `JRL-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
};

export const calculateProposalTotals = (items: any[]) => {
  const totalProducts = items.reduce((acc, item) => acc + (item.unitPrice * item.volume), 0);
  const totalTaxes = items.reduce((acc, item) => {
    const i = (item.icms || 0) + (item.pis || 0) + (item.cofins || 0) + (item.ipi || 0) + (item.otherTaxes || 0);
    return acc + i;
  }, 0);
  const totalFreight = items.reduce((acc, item) => acc + (item.freightValue || 0), 0);
  const totalValue = totalProducts + totalTaxes + totalFreight;

  return { totalProducts, totalTaxes, totalFreight, totalValue };
};

export const getStatusColor = (status: ProposalStatus) => {
  switch (status) {
    case 'Rascunho': return 'bg-gray-100 text-gray-700';
    case 'Em elaboração': return 'bg-amber-100 text-amber-700';
    case 'Enviada': return 'bg-blue-100 text-blue-700';
    case 'Em negociação': return 'bg-indigo-100 text-indigo-700';
    case 'Fechada ganha': return 'bg-emerald-100 text-emerald-700';
    case 'Fechada perdida': return 'bg-red-100 text-red-700';
    case 'Cancelada': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
