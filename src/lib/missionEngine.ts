import { Company, Priority, Temperature } from '../types';

export interface Strategy {
  products: string[];
  pitch: string;
  whatsapp: string;
  nextSteps: string[];
  objections: { [key: string]: string };
}

export const SEGMENT_STRATEGIES: { [key: string]: Strategy } = {
  'Usinas Sucroenergéticas': {
    products: ['Ácido Sulfúrico', 'Soda 50%', 'Hipoclorito', 'PAC', 'Micronutrientes', 'MAP', 'MKP'],
    pitch: "Estou falando com usinas da região porque o mercado de químicos para tratamento de caldo e águas está sofrendo com disponibilidade. Meu foco na JRL é garantir que o supply de vocês não pare por falta de insumos críticos.",
    whatsapp: "Olá, tudo bem? Sou da JRL Chemicals. Estamos apoiando usinas na gestão de supply de Ácido Sulfúrico e Soda, especialmente com foco em garantir prazo e disponibilidade nesta safra. Gostaria de entender se hoje existe algum insumo com pressão na operação de vocês.",
    nextSteps: ['Validar comprador de químicos', 'Mapear volume mensal de Ácido Sulfúrico', 'Solicitar especificação de Soda'],
    objections: {
      'Já tenho fornecedor': 'Perfeito. A maioria das usinas já tem contratos. Nosso papel entra como segunda fonte estratégica para cobrir gaps de entrega dos grandes players.',
      'Manda lista': 'Posso enviar. No setor de usinas, focamos muito em Ácidos e Bases. Qual dessas famílias hoje é mais crítica para vocês?'
    }
  },
  'Curtumes & Couro': {
    products: ['Ácido Fórmico', 'Ácido Sulfúrico', 'Ácido Acético', 'PAC', 'Sulfato de Sódio', 'Bicarbonato de Sódio', 'Butilglicol', 'Resinas PU'],
    pitch: "Muitos curtumes estão buscando alternativas para Ácido Fórmico e Acético devido às variações de importação. Na JRL, temos inteligência de brokerage para garantir o melhor custo de entrada.",
    whatsapp: "Olá! Sou da JRL Chemicals. Trabalhamos forte com a linha de ácidos e sais para curtumes. Gostaria de saber como está o seu supply de Ácido Fórmico e Sulfato hoje, se existe alguma oportunidade de melhorarmos sua logística.",
    nextSteps: ['Mapear consumo de Ácido Fórmico', 'Verificar tipo de embalagem (IBC/Granel)', 'Agendar visita técnica'],
    objections: {
      'Só compro por preço': 'Entendo perfeitamente. Em commodities para curtume, o preço é chave. Deixe-me apenas validar seu volume para eu brigar por uma condição melhor no meu próximo lote.',
      'Já compro direto': 'Ótimo. Atendemos muitos clientes que compram direto mas que usam a JRL para complementar volume quando a fábrica corta o pedido.'
    }
  },
  'Tintas & Coatings': {
    products: ['Butilglicol', 'DPG', 'PG', 'MEK', 'MIBK', 'Acetatos', 'Resinas', 'Dispersantes', 'Cargas Minerais', 'DOP/DOTP'],
    pitch: "O mercado de solventes está muito volátil. Minha intenção é entender seu mix de produção para sugerir trocas de glicóis ou garantir lotes com preço travado.",
    whatsapp: "Olá, tudo bem? Sou da JRL Chemicals. Temos lotes disponíveis de Butilglicol e MEK com preços competitivos para o setor de tintas esta semana. Gostaria de cotar esses itens com você?",
    nextSteps: ['Validar consumo de solventes', 'Entender frequência de compra (spot/contrato)', 'Enviar ficha técnica de resinas'],
    objections: {
      'Fale com o laboratório': 'Perfeito. Vou encaminhar as especificações. Mas antes, em termos de volume, qual o tamanho da oportunidade que estamos tratando?'
    }
  },
  // Default strategy for others
  'default': {
    products: ['Soda', 'Hipoclorito', 'PAC', 'Ácidos Industriais'],
    pitch: "A JRL Chemicals atua como seu braço direito em inteligência de supply. Queremos entender onde hoje existe risco na sua operação.",
    whatsapp: "Olá, somos da JRL Chemicals. Ajudamos empresas a otimizar a compra de matérias-primas químicas. Podemos conversar sobre sua demanda atual?",
    nextSteps: ['Mapear fornecedor atual', 'Validar volume mensal', 'Entender prazo de pagamento'],
    objections: {
      'Já tenho tudo': 'Excelente. Estabilidade é o objetivo. Nosso trabalho é garantir que essa estabilidade continue caso seu parceiro atual tenha problemas.'
    }
  }
};

export function getStrategy(segment: string): Strategy {
  return SEGMENT_STRATEGIES[segment] || SEGMENT_STRATEGIES['default'];
}

export function calculateCompanyScore(company: Partial<Company>): number {
  let score = 0;
  if (company.segment) score += 15;
  if (company.temperature === 'Quente') score += 15;
  if (company.temperature === 'Fogo') score += 30;
  if (['Diagnóstico completo', 'Proposta enviada'].includes(company.status as string)) score += 20;
  if (company.nextFollowupAt) score += 10;
  
  // Penalties
  // (In a real app, this would check dates)
  return Math.min(100, score);
}

export function getMission(company: Company): { title: string; action: string } {
  if (company.status === 'Novo cadastro') {
    return { title: 'Primeiro Contato', action: 'Ligar para a empresa e validar quem é o comprador responsável pelas matérias-primas.' };
  }
  if (company.status === 'Pesquisar dados') {
    return { title: 'Mapeamento de Volume', action: 'Tentar descobrir os volumes mensais dos produtos de entrada sugeridos para este segmento.' };
  }
  if (company.status === 'Proposta enviada') {
    return { title: 'Follow-up de Proposta', action: 'Cobrar retorno da proposta enviada. Validar se o preço ou prazo foram o entrave.' };
  }
  return { title: 'Manutenção de Relacionamento', action: 'Enviar mensagem de mercado ou atualização de preços para manter a marca JRL ativa.' };
}
