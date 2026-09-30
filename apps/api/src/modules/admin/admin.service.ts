import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { imageSize } from 'image-size';
import { join } from 'path';
import { asNumber } from '../../common/decimal';
import { assertValidCpf } from '../../domain/cpf';
import { assertLogoRatio, type LogoSlot } from '../../domain/logo.rules';
import { ROLES } from '../../domain/permissions';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { presentUser } from '../auth/auth.presenter';

const uploadsRoot = join(__dirname, '../../../../../uploads');

function mediaType(path: string) {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function dataUrl(relative: string | null) {
  if (!relative) return null;
  const absolute = join(uploadsRoot, relative);
  if (!existsSync(absolute)) return null;
  return `data:${mediaType(absolute)};base64,${readFileSync(absolute).toString('base64')}`;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async collaborators() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: 'SUPERUSER' } },
      include: { store: true },
      orderBy: { name: 'asc' },
    });
    return users.map(presentUser);
  }

  async createCollaborator(input: { name: string; email: string; password: string; role: string; storeId?: string }) {
    if (!ROLES.includes(input.role as (typeof ROLES)[number])) {
      throw new ConflictException('Papel de loja desconhecido.');
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(input.password, 10),
          role: input.role,
          storeId: input.storeId || null,
        },
        include: { store: true },
      });
      return presentUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
      throw error;
    }
  }

  async setCollaboratorActive(id: string, active: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role === 'SUPERUSER') throw new NotFoundException('Colaborador não encontrado.');
    const updated = await this.prisma.user.update({ where: { id }, data: { active }, include: { store: true } });
    return presentUser(updated);
  }

  async customers() {
    const rows = await this.prisma.customer.findMany({ orderBy: { name: 'asc' }, take: 100 });
    return rows.map((customer) => ({
      id: customer.id,
      name: customer.name,
      cpf: customer.cpf,
      phone: customer.phone,
      stage: customer.stage,
      active: customer.active,
      creditLimit: asNumber(customer.creditLimit),
    }));
  }

  async createCustomer(input: { name: string; cpf: string; phone?: string }) {
    const cpf = assertValidCpf(input.cpf);
    try {
      const customer = await this.prisma.customer.create({
        data: { name: input.name.trim(), cpf, phone: input.phone?.trim() || null },
      });
      return { id: customer.id, name: customer.name, cpf: customer.cpf, active: customer.active, stage: customer.stage };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um cliente com este CPF.');
      }
      throw error;
    }
  }

  async setCustomerActive(id: string, active: boolean) {
    const current = await this.prisma.customer.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Cliente não encontrado.');
    const customer = await this.prisma.customer.update({ where: { id }, data: { active } });
    return { id: customer.id, active: customer.active };
  }

  async stores() {
    return this.prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } });
  }

  async providers() {
    const rows = await this.prisma.integrationProvider.findMany({ orderBy: { name: 'asc' } });
    return rows.map((provider) => ({
      id: provider.id,
      code: provider.code,
      name: provider.name,
      category: provider.category,
      available: provider.available,
      enabled: provider.enabled,
      hasSecret: Boolean(provider.secret),
    }));
  }

  async setProvider(id: string, input: { enabled: boolean; secret?: string }) {
    const current = await this.prisma.integrationProvider.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Conector não encontrado.');
    if (!current.available && input.enabled) throw new ConflictException('Este conector não está disponível para ligar.');
    const secret = input.secret?.trim();
    return this.prisma.integrationProvider.update({
      where: { id },
      data: { enabled: input.enabled, ...(secret ? { secret } : {}) },
      select: { id: true, enabled: true, code: true },
    });
  }

  paymentOptions() {
    return this.prisma.paymentOption.findMany({ orderBy: { name: 'asc' } });
  }

  async setPaymentOption(id: string, active: boolean) {
    const current = await this.prisma.paymentOption.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Opção de pagamento não encontrada.');
    return this.prisma.paymentOption.update({ where: { id }, data: { active } });
  }

  suppliers() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  async createSupplier(input: { name: string; document?: string }) {
    return this.prisma.supplier.create({ data: { name: input.name.trim(), document: input.document?.trim() || null } });
  }

  async setSupplierActive(id: string, active: boolean) {
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Fornecedor não encontrado.');
    return this.prisma.supplier.update({ where: { id }, data: { active } });
  }

  async apiKeys() {
    const rows = await this.prisma.partnerApiKey.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((key) => ({ id: key.id, name: key.name, prefix: key.prefix, active: key.active, createdAt: key.createdAt }));
  }

  async createApiKey(name: string) {
    const token = `rf_${randomBytes(24).toString('base64url')}`;
    const created = await this.prisma.partnerApiKey.create({
      data: { name: name.trim(), tokenHash: createHash('sha256').update(token).digest('hex'), prefix: token.slice(0, 11) },
    });
    return { id: created.id, name: created.name, prefix: created.prefix, token };
  }

  async setApiKeyActive(id: string, active: boolean) {
    const current = await this.prisma.partnerApiKey.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Chave não encontrada.');
    return this.prisma.partnerApiKey.update({ where: { id }, data: { active }, select: { id: true, active: true, prefix: true } });
  }

  async company() {
    const company = await this.prisma.company.findUnique({ where: { id: 'company' } });
    return {
      name: company?.name ?? '',
      logoSquare: dataUrl(company?.logoSquare ?? null),
      logoWide: dataUrl(company?.logoWide ?? null),
      logoStory: dataUrl(company?.logoStory ?? null),
    };
  }

  private async ensureCompany(name = 'RetailFlow') {
    const current = await this.prisma.company.findUnique({ where: { id: 'company' } });
    if (current) return current;
    try {
      return await this.prisma.company.create({ data: { id: 'company', name } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.company.findUniqueOrThrow({ where: { id: 'company' } });
      }
      throw error;
    }
  }

  async updateCompany(name: string) {
    await this.ensureCompany(name.trim());
    const company = await this.prisma.company.update({ where: { id: 'company' }, data: { name: name.trim() } });
    return { name: company.name };
  }

  async saveLogo(slot: LogoSlot, file: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!file?.buffer?.length) throw new ConflictException('Envie um arquivo de imagem.');
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) throw new ConflictException('Use PNG, JPEG ou WebP.');
    const size = imageSize(file.buffer);
    if (!size.width || !size.height) throw new ConflictException('Não foi possível ler o tamanho da imagem.');
    assertLogoRatio(slot, size.width, size.height);
    const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const relative = `company/${slot}.${extension}`;
    const directory = join(uploadsRoot, 'company');
    mkdirSync(directory, { recursive: true });
    const current = await this.prisma.company.findUnique({ where: { id: 'company' } });
    const previous = slot === 'square' ? current?.logoSquare : slot === 'banner' ? current?.logoWide : current?.logoStory;
    if (previous && previous !== relative) {
      const oldPath = join(uploadsRoot, previous);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    writeFileSync(join(uploadsRoot, relative), file.buffer);
    const field = slot === 'square' ? 'logoSquare' : slot === 'banner' ? 'logoWide' : 'logoStory';
    await this.ensureCompany();
    await this.prisma.company.update({ where: { id: 'company' }, data: { [field]: relative } });
    return { slot, url: dataUrl(relative) };
  }
}
