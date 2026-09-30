import { api } from '../../services/http';
import type { Dashboard } from '../../types';

const query = `query { managementDashboard { salesCount salesTotal pendingCredit openTickets lowStock delinquentInstallments stores { name salesTotal salesCount } } }`;

export async function loadDashboard(): Promise<{ data: Dashboard; source: string }> {
  try {
    const result = await api<{ data?: { managementDashboard: Dashboard } }>('/api/v1/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (result.data?.managementDashboard) return { data: result.data.managementDashboard, source: 'GraphQL' };
  } catch {
    /* o REST abaixo cobre a mesma leitura */
  }
  return { data: await api<Dashboard>('/api/v1/dashboard'), source: 'REST' };
}
