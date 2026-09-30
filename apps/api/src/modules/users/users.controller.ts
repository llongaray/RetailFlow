import { Body, Controller, Get, Post } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import type { AuthUser } from '../../common/auth-user';
import { CurrentUser, Permissions } from '../../common/decorators';
import { ROLES } from '../../domain/permissions';
import { UsersService } from './users.service';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn([...ROLES])
  role!: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Permissions('user.read')
  list() {
    return this.users.list();
  }

  @Post()
  @Permissions('user.read')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Apenas administração cria usuários.');
    return this.users.create(dto);
  }
}
