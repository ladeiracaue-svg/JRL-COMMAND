export async function fetchCNPJData(cnpj: string) {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) throw new Error('CNPJ inválido');

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) throw new Error('Empresa não encontrada');
    const data = await response.json();
    
    return {
      name: data.razao_social,
      fantasyName: data.nome_fantasia || data.razao_social,
      cnpj: data.cnpj,
      address: {
        street: data.logradouro,
        number: data.numero,
        complement: data.complemento,
        neighborhood: data.bairro,
        city: data.municipio,
        state: data.uf,
        zip: data.cep
      },
      phone: data.ddd_telefone_1 || '',
      email: data.email || '',
      segment: data.cnae_fiscal_descricao || ''
    };
  } catch (error) {
    console.error('Error fetching CNPJ:', error);
    throw error;
  }
}
