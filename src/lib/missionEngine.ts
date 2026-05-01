import { Company, Priority, Temperature, CompanyStatus } from '../types';

export interface Strategy {
  products: string[];
  pitch: string;
  whatsapp: string;
  nextSteps: string[];
  objections: { [key: string]: string };
}

export const SEGMENT_STRATEGIES: { [key: string]: Strategy } = {
  'Distribuição / Formulação Química': {
    products: ['HCl', 'Soda 50%', 'PAC', 'Hipoclorito', 'SLES', 'MEG/DEG/PG'],
    pitch: "Muitos formuladores sofrem com a cotação spot que oscila semanalmente. A JRL Chemicals trabalha com visão de lote antecipado para garantir sua margem.",
    whatsapp: "Olá! Sou da JRL. Temos lotes de Soda e Glicóis chegando. Gostaria de cotar para sua produção de higiene?",
    nextSteps: ['Identificar segunda fonte', 'Mapear ruptura', 'Oferecer alternativa logística'],
    objections: { 'Preço tá alto': 'Em commodities o preço é volátil, mas nossa entrega é garantida. Quer comparar com seu lote de segurança?' }
  },
  'Usinas Sucroenergéticas': {
    products: ['Ácido Sulfúrico', 'Soda 50%', 'Hipoclorito', 'PAC', 'MAP', 'MKP'],
    pitch: "O foco na safra é disponibilidade. Na JRL, garantimos que o supply de químicos de caldo e águas não pare.",
    whatsapp: "Olá! A JRL Chemicals está apoiando usinas na gestão de Ácido Sulfúrico para esta safra. Como está seu estoque?",
    nextSteps: ['Explorar risco de safra', 'Mapear produto crítico', 'Trabalhar previsibilidade'],
    objections: { 'Já tenho contrato': 'Perfeito. Atuamos como backup estratégico para quando o fornecedor principal corta volume.' }
  },
  'Curtumes & Couro': {
    products: ['Ácido Fórmico', 'Ácido Acético', 'PAC', 'Sulfato de Sódio', 'Butilglicol'],
    pitch: "O mercado de couro exige custo agressivo por pele. Temos brokerage forte em Ácido Fórmico e sais.",
    whatsapp: "Olá! Trabalhamos com a linha completa para curtumes. Gostaria de cotar o Ácido Fórmico e o Sulfato?",
    nextSteps: ['Explorar custo por pele', 'Regularidade de lote', 'Teste de especificidade'],
    objections: { 'Manda preço': 'Claro. Qual o volume do seu próximo lote para eu brigar por uma condição melhor?' }
  },
  // Add more as needed...
  'default': {
    products: ['Soda', 'Hipoclorito', 'PAC', 'Insumos Industriais'],
    pitch: "A JRL Chemicals integra inteligência e logística para otimizar sua compra de químicos.",
    whatsapp: "Olá! Somos da JRL. Podemos conversar sobre sua demanda de químicos atual?",
    nextSteps: ['Mapear fornecedor atual', 'Qualificar comprador', 'Validar volume'],
    objections: { 'Tudo certo por aqui': 'Ótimo! Estabilidade é chave. Ficamos no seu radar para uma cotação de comparação.' }
  }
};

export function getStrategy(segment: string): Strategy {
  return SEGMENT_STRATEGIES[segment] || SEGMENT_STRATEGIES['default'];
}

export function calculateCompanyScore(company: Partial<Company>): { score: number; reason: string } {
  let score = 0;
  let reasons: string[] = [];

  // Positivos
  if (company.segment) { score += 15; reasons.push('Segmento Aderente (+15)'); }
  if (company.temperature === 'Urgente' || company.temperature === 'Quente') { score += 15; reasons.push('Temperatura Quente (+15)'); }
  if (company.status === 'Diagnóstico completo') { score += 20; reasons.push('Diagnóstico Completo (+20)'); }
  if (company.status === 'Proposta enviada') { score += 15; reasons.push('Proposta Enviada (+15)'); }
  
  // Negativos (Penalidades)
  // Nota: Em uma app real, compararíamos datas. Simularemos aqui.
  
  return { 
    score: Math.min(100, Math.max(0, score)), 
    reason: reasons.join(', ') 
  };
}

export function getMission(company: Company): { title: string; action: string } {
  if (company.status === 'Novo cadastro') {
    return { title: 'Mapeamento de Comprador', action: 'Ligar para identificar quem decide a compra de químicos industriais.' };
  }
  if (company.status === 'Proposta enviada') {
    return { title: 'Fechamento / Negociação', action: 'Realizar follow-up agressivo. Validar preço vs competência técnica.' };
  }
  return { title: 'Manutenção Preventiva', action: 'Enviar atualização de mercado e manter a marca JRL no radar.' };
}
