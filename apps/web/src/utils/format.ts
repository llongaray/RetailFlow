export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administração',
  GERENTE: 'Gerência',
  ANALISTA_CREDITO: 'Análise de crédito',
  VENDEDOR: 'Vendas',
  ATENDIMENTO: 'Atendimento',
  FINANCEIRO: 'Financeiro',
};

export const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Concluída',
  PENDING_CREDIT: 'Aguardando crédito',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  CANCELLED: 'Cancelada',
  STORE: 'Loja',
  NUVEMSHOP: 'Nuvemshop',
  LOJA: 'Loja',
  NFE: 'NF-e',
  NFSE: 'NFS-e',
  AUTHORIZED: 'Autorizada',
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  UNDER_ANALYSIS: 'Em análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CONTRACTED: 'Contratada',
  ACTIVE: 'Ativo',
  OPEN: 'Em aberto',
  IN_PROGRESS: 'Em atendimento',
  RESOLVED: 'Resolvido',
  PAID: 'Paga',
  CONFIRMED: 'Confirmado',
  REFUNDED: 'Estornado',
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  DONE: 'Concluído',
  FAILED: 'Falhou',
  LEAD: 'Lead',
  ATIVO: 'Ativo',
  INADIMPLENTE: 'Inadimplente',
  INATIVO: 'Inativo',
  COM_ESTOQUE: 'Com estoque',
  SEM_ESTOQUE: 'Sem estoque',
  ADS: 'Anúncios',
  IA: 'IA',
  LEGADO: 'Legado',
  PAGAMENTO: 'Pagamento',
  FORNECEDOR: 'Fornecedor',
};
