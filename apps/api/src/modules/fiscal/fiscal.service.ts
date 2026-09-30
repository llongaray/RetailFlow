import { createHash } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { asNumber } from '../../common/decimal';
import { assertUniqueFiscal } from '../../domain/channel.rules';
import { DomainError } from '../../domain/domain-error';
import { decryptSecret, encryptSecret } from '../../infrastructure/crypto/secret-box';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NuvemshopService } from '../nuvemshop/nuvemshop.service';

const PROFILE_ID = 'company';

type ProfileInput = {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  regime: string;
  ncm: string;
  cfop: string;
  csosn: string;
  cest?: string;
  serviceCode?: string;
  issRate?: number;
  city: string;
  certificateBase64?: string;
  certificatePassword?: string;
};

@Injectable()
export class FiscalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly nuvemshop: NuvemshopService,
  ) {}

  mode() {
    return this.config.get<string>('FISCAL_MODE') === 'live' ? 'live' : 'demo';
  }

  async status() {
    const profile = await this.prisma.fiscalProfile.findUnique({ where: { id: PROFILE_ID } });
    return { mode: this.mode(), ready: Boolean(profile) };
  }

  async profile() {
    const profile = await this.prisma.fiscalProfile.findUnique({ where: { id: PROFILE_ID } });
    if (!profile) return { mode: this.mode(), profile: null };
    return {
      mode: this.mode(),
      profile: {
        cnpj: profile.cnpj,
        legalName: profile.legalName,
        tradeName: profile.tradeName,
        stateRegistration: profile.stateRegistration,
        municipalRegistration: profile.municipalRegistration,
        regime: profile.regime,
        ncm: profile.ncm,
        cfop: profile.cfop,
        csosn: profile.csosn,
        cest: profile.cest,
        serviceCode: profile.serviceCode,
        issRate: profile.issRate === null ? null : asNumber(profile.issRate),
        city: profile.city,
        hasCertificate: Boolean(profile.certificateEnc),
      },
    };
  }

  async saveProfile(input: ProfileInput) {
    const cnpj = input.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) throw new DomainError('FISCAL', 'O CNPJ precisa ter 14 dígitos.');
    const current = await this.prisma.fiscalProfile.findUnique({ where: { id: PROFILE_ID } });
    const secret = this.secret();
    const certificate = input.certificateBase64?.trim();
    const password = input.certificatePassword?.trim();
    const data = {
      cnpj,
      legalName: input.legalName.trim(),
      tradeName: input.tradeName?.trim() || null,
      stateRegistration: input.stateRegistration?.trim() || null,
      municipalRegistration: input.municipalRegistration?.trim() || null,
      regime: input.regime.trim(),
      ncm: input.ncm.trim(),
      cfop: input.cfop.trim(),
      csosn: input.csosn.trim(),
      cest: input.cest?.trim() || null,
      serviceCode: input.serviceCode?.trim() || null,
      issRate: input.issRate ?? null,
      city: input.city.trim(),
      certificateEnc: certificate ? encryptSecret(certificate, secret) : current?.certificateEnc ?? null,
      certificatePasswordEnc: password ? encryptSecret(password, secret) : current?.certificatePasswordEnc ?? null,
    };
    await this.prisma.fiscalProfile.upsert({ where: { id: PROFILE_ID }, update: data, create: { id: PROFILE_ID, ...data } });
    return this.profile();
  }

  async emit(saleId: string, kind: 'NFE' | 'NFSE') {
    if (this.mode() === 'live') {
      throw new DomainError('FISCAL_LIVE', 'A emissão fiscal ao vivo ainda não está disponível. Mantenha FISCAL_MODE=demo.');
    }
    const profile = await this.prisma.fiscalProfile.findUnique({ where: { id: PROFILE_ID } });
    if (!profile) throw new DomainError('FISCAL', 'Cadastre o perfil fiscal antes de emitir.');
    if (profile.certificateEnc) decryptSecret(profile.certificateEnc, this.secret());
    const sale = await this.prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    if (sale.status === 'CANCELLED' || sale.status === 'PENDING_CREDIT') {
      throw new DomainError('FISCAL', 'Esta venda ainda não pode emitir nota.');
    }
    const existing = await this.prisma.fiscalDocument.findUnique({ where: { saleId_kind: { saleId, kind } } });
    assertUniqueFiscal(existing);
    if (existing) throw new DomainError('FISCAL_DUPLICATE', 'Já existe uma nota deste tipo para a venda.');
    const accessKey = this.accessKey(saleId, kind);
    const link = `https://demo.fiscal.retailflow.local/notas/${accessKey}`;
    const number = accessKey.slice(-8);
    let pushedToChannel = false;
    if (kind === 'NFE' && sale.channel === 'NUVEMSHOP' && sale.externalOrderId) {
      pushedToChannel = await this.nuvemshop.attachInvoice(sale.externalOrderId, { key: accessKey, link });
    }
    try {
      const document = await this.prisma.fiscalDocument.create({
        data: { saleId, kind, status: 'AUTHORIZED', accessKey, number, link, pushedToChannel },
      });
      return this.present(document);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainError('FISCAL_DUPLICATE', 'Já existe uma nota autorizada deste tipo para a venda.');
      }
      throw error;
    }
  }

  private accessKey(saleId: string, kind: string) {
    const hash = createHash('sha256').update(`${saleId}:${kind}`).digest('hex');
    return hash
      .split('')
      .map((char) => (Number.parseInt(char, 16) % 10).toString())
      .join('')
      .slice(0, 44);
  }

  private present(document: { id: string; kind: string; status: string; accessKey: string | null; number: string | null; link: string | null; pushedToChannel: boolean }) {
    return {
      id: document.id,
      kind: document.kind,
      status: document.status,
      accessKey: document.accessKey,
      number: document.number,
      link: document.link,
      pushedToChannel: document.pushedToChannel,
    };
  }

  private secret() {
    return this.config.get<string>('INTEGRATION_SECRET') ?? 'retailflow-demo-integration-secret';
  }
}
