import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { CreateStoreDto } from './stores.controller';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.store.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateStoreDto) {
    try {
      return await this.prisma.store.create({
        data: { code: dto.code.trim().toUpperCase(), name: dto.name.trim(), city: dto.city.trim(), active: dto.active ?? true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma loja com este código.');
      }
      throw error;
    }
  }
}
