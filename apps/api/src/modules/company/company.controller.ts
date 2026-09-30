import { Controller, Get } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Permissions } from '../../common/decorators';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const uploadsRoot = join(__dirname, '../../../../../uploads');

function dataUrl(relative: string | null) {
  if (!relative) return null;
  const absolute = join(uploadsRoot, relative);
  if (!existsSync(absolute)) return null;
  const type = relative.endsWith('.png') ? 'image/png' : relative.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return `data:${type};base64,${readFileSync(absolute).toString('base64')}`;
}

@Controller('company')
export class CompanyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('dashboard.read')
  async get() {
    const company = await this.prisma.company.findUnique({ where: { id: 'company' } });
    return { name: company?.name ?? null, logoSquare: dataUrl(company?.logoSquare ?? null) };
  }
}
