import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Company, UserProfile } from '../types';

const SAMPLE_COMPANIES = [
  { name: 'Cadam S.A', segment: 'Distribuição / Formulação Química', status: 'Novo cadastro', temperature: 'Morno', potential: 50000, color: 'blue' },
  { name: 'CHT Brasil', segment: 'Distribuição / Formulação Química', status: 'Pesquisar dados', temperature: 'Frio', potential: 30000, color: 'blue' },
  { name: 'Fedrigoni', segment: 'Papel, Celulose & Embalagens', status: 'Contato feito', temperature: 'Quente', potential: 120000, color: 'green' },
  { name: 'Ester', segment: 'Usinas Sucroenergéticas', status: 'Em qualificação', temperature: 'Quente', potential: 200000, color: 'gold' },
  { name: 'AMERICA LEATHER IMP. E EXP. LTDA', segment: 'Curtumes & Couro', status: 'Proposta enviada', temperature: 'Fogo', potential: 80000, color: 'red' },
  { name: 'Cyan Tintas', segment: 'Tintas & Coatings', status: 'Novo cadastro', temperature: 'Morno', potential: 45000, color: 'purple' },
  { name: 'POLY URETHANE IND E COMERCIO LTDA', segment: 'Polímeros, PU & Borrachas', status: 'Aguardando retorno', temperature: 'Morno', potential: 60000, color: 'indigo' },
  { name: 'De Sangosse', segment: 'Agrícola & Fertilizantes', status: 'Cliente ativo', temperature: 'Quente', potential: 300000, color: 'emerald' },
];

export async function seedInitialData(userId: string, userName: string) {
  try {
    for (const comp of SAMPLE_COMPANIES) {
      await addDoc(collection(db, 'companies'), {
        ...comp,
        responsibleUserId: userId,
        responsibleUserName: userName,
        priority: 'Média',
        cnpj: '00.000.000/0001-00',
        phone: '(11) 99999-9999',
        email: `contato@${comp.name.toLowerCase().replace(/ /g, '')}.com.br`,
        address: {
            city: 'São Paulo',
            state: 'SP',
            street: 'Rua das Industrias',
            number: '123',
            neighborhood: 'Centro',
            zip: '01001-000'
        },
        score: Math.floor(Math.random() * 100),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  }
}

export async function setupAdminProfile(userId: string, email: string) {
    await setDoc(doc(db, 'users', userId), {
        uid: userId,
        name: 'Diretoria JRL',
        email: email,
        role: 'admin',
        active: true,
        commissionRateDefault: 2.5,
        createdAt: serverTimestamp()
    });
}
