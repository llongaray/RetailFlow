import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../domain/domain-error';
import { decryptSecret, encryptSecret } from '../../infrastructure/crypto/secret-box';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const PROVIDER = 'MERCADOPAGO';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  mode() {
    return this.config.get<string>('MERCADOPAGO_MODE') === 'live' ? 'live' : 'demo';
  }

  async status() {
    const account = await this.prisma.paymentAccount.findUnique({ where: { provider: PROVIDER } });
    return { mode: this.mode(), provider: PROVIDER, active: account?.active ?? false, ready: Boolean(account?.accessTokenEnc) };
  }

  async saveAccount(input: { publicKey?: string; accessToken?: string }) {
    const current = await this.prisma.paymentAccount.findUnique({ where: { provider: PROVIDER } });
    const secret = this.secret();
    const accessToken = input.accessToken?.trim() || (current ? decryptSecret(current.accessTokenEnc, secret) : '');
    if (!accessToken) throw new DomainError('BILLING', 'Informe o access token do Mercado Pago.');
    const publicKey = input.publicKey?.trim() || (current?.publicKeyEnc ? decryptSecret(current.publicKeyEnc, secret) : '');
    const data = {
      publicKeyEnc: publicKey ? encryptSecret(publicKey, secret) : null,
      accessTokenEnc: encryptSecret(accessToken, secret),
      active: true,
    };
    await this.prisma.paymentAccount.upsert({
      where: { provider: PROVIDER },
      update: data,
      create: { provider: PROVIDER, ...data },
    });
    return this.status();
  }

  async createCharge(input: { customerId: string; saleId?: string; amount: number; method: string }) {
    if (!(input.amount > 0)) throw new DomainError('BILLING', 'O valor da cobrança precisa ser maior que zero.');
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer?.active) throw new DomainError('BILLING', 'Cliente indisponível para cobrança.');
    if (input.saleId) {
      const sale = await this.prisma.sale.findUnique({ where: { id: input.saleId } });
      if (!sale || sale.customerId !== customer.id) throw new DomainError('BILLING', 'A venda não pertence a este cliente.');
    }
    const id = randomUUID();
    const issued = await this.issue(input.amount, input.method, id);
    const charge = await this.prisma.charge.create({
      data: {
        id,
        customerId: customer.id,
        saleId: input.saleId ?? null,
        amount: input.amount,
        method: input.method,
        status: 'PENDING',
        provider: PROVIDER,
        externalId: issued.externalId,
        copyPaste: issued.copyPaste,
      },
    });
    return {
      id: charge.id,
      amount: input.amount,
      method: charge.method,
      status: charge.status,
      provider: charge.provider,
      copyPaste: charge.copyPaste,
      createdAt: charge.createdAt,
    };
  }

  private async issue(amount: number, method: string, chargeId: string) {
    if (this.mode() === 'live') {
      const account = await this.prisma.paymentAccount.findUnique({ where: { provider: PROVIDER } });
      if (!account?.active) throw new DomainError('BILLING', 'A conta Mercado Pago não está ativa.');
      const token = decryptSecret(account.accessTokenEnc, this.secret());
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': chargeId },
        body: JSON.stringify({
          transaction_amount: amount,
          payment_method_id: method === 'CARD' ? 'visa' : 'pix',
          description: `RetailFlow ${chargeId}`,
          payer: { email: 'pagador@demo.retailflow.local' },
        }),
      });
      if (!response.ok) throw new DomainError('BILLING', `Mercado Pago respondeu ${response.status}.`);
      const body = (await response.json()) as { id?: number | string; point_of_interaction?: { transaction_data?: { qr_code?: string } } };
      return {
        externalId: String(body.id ?? chargeId),
        copyPaste: body.point_of_interaction?.transaction_data?.qr_code ?? null,
      };
    }
    const digest = createHash('sha256').update(chargeId).digest('hex').slice(0, 24);
    return {
      externalId: `mp-demo-${chargeId}`,
      copyPaste: method === 'PIX' ? `00020126DEMO${digest}` : null,
    };
  }

  private secret() {
    return this.config.get<string>('INTEGRATION_SECRET') ?? 'retailflow-demo-integration-secret';
  }
}
