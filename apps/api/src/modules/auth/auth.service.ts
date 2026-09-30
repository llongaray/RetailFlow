import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { presentUser } from './auth.presenter';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { store: true },
    });
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user?.active || !matches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    if (user.role === 'SUPERUSER') {
      throw new UnauthorizedException('Esta conta entra só no admin.');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, user: presentUser(user) };
  }

  async loginAdmin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { store: true },
    });
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user?.active || !matches || user.role !== 'SUPERUSER') {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, user: presentUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { store: true } });
    if (!user?.active) throw new UnauthorizedException('Usuário inativo.');
    return presentUser(user);
  }
}
