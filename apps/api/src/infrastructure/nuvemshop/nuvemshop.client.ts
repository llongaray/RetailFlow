import { ConfigService } from '@nestjs/config';
import { demoOrders, mapNuvemshopOrder, type RemoteOrder } from '../../domain/nuvemshop-order';

export interface NuvemshopClient {
  mode: 'demo' | 'live';
  authorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<{ accessToken: string; storeId: string; name: string; domain: string; email: string | null }>;
  listOrders(storeId: string, accessToken: string): Promise<RemoteOrder[]>;
  fetchOrder(storeId: string, accessToken: string, orderId: string): Promise<RemoteOrder>;
  attachInvoice(storeId: string, accessToken: string, orderId: string, note: { key: string; link: string }): Promise<void>;
}

const USER_AGENT = 'RetailFlow (contato@retailflow.local)';

export class DemoNuvemshopClient implements NuvemshopClient {
  readonly mode = 'demo' as const;

  authorizeUrl() {
    return '';
  }

  async exchangeCode() {
    return {
      accessToken: 'demo-token',
      storeId: '900001',
      name: 'Loja Demonstração',
      domain: 'demo.nuvemshop.com.br',
      email: 'loja@demo.nuvemshop.com.br',
    };
  }

  async listOrders() {
    return demoOrders();
  }

  async fetchOrder(_storeId: string, _accessToken: string, orderId: string) {
    const order = demoOrders().find((entry) => entry.id === orderId);
    if (!order) throw new Error('Pedido de demonstração não encontrado.');
    return order;
  }

  async attachInvoice() {
    return undefined;
  }
}

export class LiveNuvemshopClient implements NuvemshopClient {
  readonly mode = 'live' as const;

  constructor(private readonly config: ConfigService) {}

  authorizeUrl(state: string) {
    const clientId = this.required('NUVEMSHOP_CLIENT_ID');
    return `https://www.nuvemshop.com.br/apps/${encodeURIComponent(clientId)}/authorize?state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(code: string) {
    const response = await this.post('https://www.nuvemshop.com.br/apps/authorize/token', {
      client_id: this.required('NUVEMSHOP_CLIENT_ID'),
      client_secret: this.required('NUVEMSHOP_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
    });
    const accessToken = String(response.access_token ?? '');
    const storeId = String(response.user_id ?? '');
    if (!accessToken || !storeId) throw new Error('A Nuvemshop não devolveu o token da loja.');
    const store = (await this.get(`/v1/${storeId}/store`, accessToken)) as Record<string, unknown>;
    const name = store.name;
    const storeName = typeof name === 'string' ? name : String((name as { pt?: string } | undefined)?.pt ?? `Loja ${storeId}`);
    return {
      accessToken,
      storeId,
      name: storeName,
      domain: String(store.original_domain ?? store.domain ?? ''),
      email: store.email ? String(store.email) : null,
    };
  }

  async listOrders(storeId: string, accessToken: string) {
    const rows = await this.get(`/v1/${storeId}/orders`, accessToken);
    const list = Array.isArray(rows) ? rows : [];
    return list.map((row) => mapNuvemshopOrder(row as Record<string, unknown>));
  }

  async fetchOrder(storeId: string, accessToken: string, orderId: string) {
    const row = await this.get(`/v1/${storeId}/orders/${orderId}`, accessToken);
    return mapNuvemshopOrder((row ?? {}) as Record<string, unknown>);
  }

  async attachInvoice(storeId: string, accessToken: string, orderId: string, note: { key: string; link: string }) {
    await this.request(`/v1/${storeId}/orders/${orderId}`, accessToken, 'PUT', {
      owner_note: `NF-e ${note.key} ${note.link}`,
    });
  }

  private required(name: string) {
    const value = this.config.get<string>(name);
    if (!value) throw new Error(`${name} não está no ambiente.`);
    return value;
  }

  private get(path: string, accessToken: string) {
    return this.request(path, accessToken, 'GET');
  }

  private async post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT, Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Nuvemshop respondeu ${response.status}.`);
    return (await response.json()) as Record<string, unknown>;
  }

  private async request(path: string, accessToken: string, method: string, body?: unknown) {
    const response = await fetch(`https://api.nuvemshop.com.br${path}`, {
      method,
      headers: {
        Authentication: `bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`Nuvemshop respondeu ${response.status}.`);
    if (response.status === 204) return {};
    return response.json() as Promise<unknown>;
  }
}
