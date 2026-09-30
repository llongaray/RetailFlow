import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { DomainError } from '../../domain/domain-error';
import { readState, signState, type OAuthReturn } from '../../domain/oauth-state';
import { decryptSecret, encryptSecret } from '../../infrastructure/crypto/secret-box';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DemoNuvemshopClient, LiveNuvemshopClient, type NuvemshopClient } from '../../infrastructure/nuvemshop/nuvemshop.client';
import { OrderImportService } from './order-import.service';

const COMPANY_ID = 'company';

@Injectable()
export class NuvemshopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly importer: OrderImportService,
  ) {}

  mode() {
    return this.config.get<string>('NUVEMSHOP_MODE') === 'live' ? 'live' : 'demo';
  }

  appProfile() {
    return {
      mode: this.mode(),
      redirectUri: this.config.get<string>('NUVEMSHOP_REDIRECT_URI') ?? 'http://localhost:3000/api/v1/integrations/nuvemshop/callback',
    };
  }

  async status() {
    const connection = await this.prisma.nuvemshopConnection.findUnique({ where: { companyId: COMPANY_ID }, include: { store: true } });
    return {
      mode: this.mode(),
      connected: connection?.status === 'CONNECTED',
      storeName: connection?.storeName ?? null,
      nuvemshopStoreId: connection?.nuvemshopStoreId ?? null,
      domain: connection?.storeDomain ?? null,
      lastSyncAt: connection?.lastSyncAt ?? null,
      localStoreName: connection?.store.name ?? null,
    };
  }

  async connect(storeId?: string) {
    const store = await this.resolveStore(storeId);
    if (this.mode() === 'live') {
      return { mode: 'live' as const, url: this.authorizeUrl(store.id, 'panel') };
    }
    const shop = await this.client().exchangeCode('demo');
    await this.saveConnection({
      localStoreId: store.id,
      nuvemshopStoreId: shop.storeId,
      accessToken: shop.accessToken,
      storeName: shop.name,
      storeDomain: shop.domain,
      storeEmail: shop.email,
    });
    return { mode: 'demo' as const, connected: true };
  }

  async oauthStart() {
    const store = await this.resolveStore();
    return { url: this.authorizeUrl(store.id, 'admin') };
  }

  oauthReturn(state: string) {
    const admin = this.config.get<string>('ADMIN_ORIGIN') ?? 'http://localhost:5174';
    const panel = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173';
    try {
      const parsed = readState(state, this.secret());
      const origin = parsed.returnTo === 'admin' ? admin : panel;
      const path = parsed.returnTo === 'admin' ? '/' : '/integrations';
      return { origin, path };
    } catch {
      return { origin: panel, path: '/integrations' };
    }
  }

  async finishOAuth(code: string, state: string) {
    const parsed = readState(state, this.secret());
    const shop = await new LiveNuvemshopClient(this.config).exchangeCode(code);
    await this.saveConnection({
      localStoreId: parsed.storeId,
      nuvemshopStoreId: shop.storeId,
      accessToken: shop.accessToken,
      storeName: shop.name,
      storeDomain: shop.domain,
      storeEmail: shop.email,
    });
  }

  private authorizeUrl(storeId: string, returnTo: OAuthReturn) {
    return new LiveNuvemshopClient(this.config).authorizeUrl(signState(storeId, this.secret(), Date.now(), returnTo));
  }

  async sync(actorId: string) {
    const connection = await this.connected();
    const token = decryptSecret(connection.accessTokenEnc, this.secret());
    const orders = await this.clientFor(token).listOrders(connection.nuvemshopStoreId, token);
    const results = [];
    for (const order of orders) {
      results.push(await this.importer.importOne(connection, order, actorId));
    }
    await this.prisma.integrationJob.create({
      data: { type: 'NUVEMSHOP_SYNC', payload: JSON.stringify({ imported: results.filter((item) => item.created).length }), status: 'DONE' },
    });
    return { imported: results.filter((item) => item.created).length, skipped: results.filter((item) => !item.created).length };
  }

  async disconnect() {
    const connection = await this.prisma.nuvemshopConnection.findUnique({ where: { companyId: COMPANY_ID } });
    if (!connection) return { connected: false };
    await this.prisma.nuvemshopConnection.update({
      where: { id: connection.id },
      data: { status: 'DISCONNECTED', accessTokenEnc: encryptSecret('', this.secret()) },
    });
    return { connected: false };
  }

  async receiveWebhook(body: { store_id?: unknown; event?: unknown; id?: unknown }) {
    const storeId = body.store_id === undefined || body.store_id === null ? '' : String(body.store_id);
    const event = body.event === undefined || body.event === null ? '' : String(body.event);
    const orderId = body.id === undefined || body.id === null ? '' : String(body.id);
    if (!storeId || !event || !orderId) throw new DomainError('WEBHOOK', 'Evento da Nuvemshop incompleto.');
    const externalEventId = `${storeId}:${event}:${orderId}`;
    try {
      const row = await this.prisma.webhookEvent.create({
        data: {
          provider: 'NUVEMSHOP',
          externalEventId,
          event,
          payload: JSON.stringify({ storeId, orderId, event }),
          status: 'PENDING',
        },
      });
      await this.prisma.integrationJob.create({
        data: { type: 'NUVEMSHOP_ORDER', payload: JSON.stringify({ webhookEventId: row.id }), status: 'PENDING' },
      });
      return { ok: true, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { ok: true, duplicate: true };
      throw error;
    }
  }

  async handleJob(payload: { webhookEventId?: string }) {
    if (!payload.webhookEventId) throw new Error('Evento de webhook sem identificador.');
    const row = await this.prisma.webhookEvent.findUnique({ where: { id: payload.webhookEventId } });
    if (!row || row.status === 'DONE') return;
    const body = JSON.parse(row.payload) as { storeId: string; orderId: string };
    const connection = await this.prisma.nuvemshopConnection.findFirst({
      where: { nuvemshopStoreId: body.storeId, status: 'CONNECTED' },
    });
    if (!connection) throw new Error('Loja Nuvemshop não conectada.');
    const token = decryptSecret(connection.accessTokenEnc, this.secret());
    const order = await this.clientFor(token).fetchOrder(connection.nuvemshopStoreId, token, body.orderId);
    await this.importer.importOne(connection, order, await this.sellerId());
    await this.prisma.webhookEvent.update({ where: { id: row.id }, data: { status: 'DONE', lastError: null } });
  }

  async attachInvoice(externalOrderId: string, note: { key: string; link: string }) {
    const connection = await this.prisma.nuvemshopConnection.findUnique({ where: { companyId: COMPANY_ID } });
    if (!connection || connection.status !== 'CONNECTED') return false;
    const token = decryptSecret(connection.accessTokenEnc, this.secret());
    await this.clientFor(token).attachInvoice(connection.nuvemshopStoreId, token, externalOrderId, note);
    return true;
  }

  private client(): NuvemshopClient {
    return this.mode() === 'live' ? new LiveNuvemshopClient(this.config) : new DemoNuvemshopClient();
  }

  private clientFor(token: string): NuvemshopClient {
    if (token && token !== 'demo-token') return new LiveNuvemshopClient(this.config);
    return this.client();
  }

  private secret() {
    return this.config.get<string>('INTEGRATION_SECRET') ?? 'retailflow-demo-integration-secret';
  }

  private async resolveStore(storeId?: string) {
    if (storeId) {
      const chosen = await this.prisma.store.findFirst({ where: { id: storeId, active: true } });
      if (!chosen) throw new DomainError('NUVEMSHOP', 'Filial indisponível para a conexão.');
      return chosen;
    }
    const preferred = await this.prisma.store.findFirst({ where: { code: 'POA', active: true } });
    const store = preferred ?? (await this.prisma.store.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }));
    if (!store) throw new DomainError('NUVEMSHOP', 'Não há filial ativa para receber o estoque.');
    return store;
  }

  private async saveConnection(input: {
    localStoreId: string;
    nuvemshopStoreId: string;
    accessToken: string;
    storeName: string;
    storeDomain: string;
    storeEmail: string | null;
  }) {
    await this.prisma.company.upsert({
      where: { id: COMPANY_ID },
      update: {},
      create: { id: COMPANY_ID, name: 'RetailFlow' },
    });
    const data = {
      storeId: input.localStoreId,
      nuvemshopStoreId: input.nuvemshopStoreId,
      accessTokenEnc: encryptSecret(input.accessToken, this.secret()),
      storeName: input.storeName,
      storeDomain: input.storeDomain,
      storeEmail: input.storeEmail,
      status: 'CONNECTED',
      connectedAt: new Date(),
    };
    await this.prisma.nuvemshopConnection.upsert({
      where: { companyId: COMPANY_ID },
      update: data,
      create: { companyId: COMPANY_ID, ...data },
    });
  }

  private async connected() {
    const connection = await this.prisma.nuvemshopConnection.findUnique({ where: { companyId: COMPANY_ID } });
    if (!connection || connection.status !== 'CONNECTED') throw new DomainError('NUVEMSHOP', 'A loja Nuvemshop não está conectada.');
    return connection;
  }

  private async sellerId() {
    const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } });
    if (!admin) throw new Error('Não há administrador para registrar o pedido.');
    return admin.id;
  }
}
