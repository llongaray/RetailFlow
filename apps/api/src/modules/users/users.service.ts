import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { presentUser } from '../auth/auth.presenter';
import type { CreateUserDto } from './users.controller';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({ include: { store: true }, orderBy: { name: 'asc' } });
    return users.map(presentUser);
  }

  async create(dto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          role: dto.role,
          storeId: dto.storeId ?? null,
          active: dto.active ?? true,
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
}
