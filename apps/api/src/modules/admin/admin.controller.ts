import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Public } from '../../common/decorators';
import { LOGO_SLOTS, type LogoSlot } from '../../domain/logo.rules';
import { ROLES } from '../../domain/permissions';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../auth/dto/login.dto';
import { AdminService } from './admin.service';
import { SuperuserGuard } from './superuser.guard';

class CreateCollaboratorDto {
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
}

class ActiveDto {
  @IsBoolean()
  active!: boolean;
}

class CreateCustomerDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  cpf!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class ProviderDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  secret?: string;
}

class CreateSupplierDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  document?: string;
}

class CreateKeyDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

class CompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

class LogoDto {
  @IsIn([...LOGO_SLOTS])
  slot!: LogoSlot;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @UseGuards(SuperuserGuard)
  @Get('stores')
  stores() {
    return this.admin.stores();
  }

  @UseGuards(SuperuserGuard)
  @Get('collaborators')
  collaborators() {
    return this.admin.collaborators();
  }

  @UseGuards(SuperuserGuard)
  @Post('collaborators')
  createCollaborator(@Body() dto: CreateCollaboratorDto) {
    return this.admin.createCollaborator(dto);
  }

  @UseGuards(SuperuserGuard)
  @Patch('collaborators/:id')
  setCollaborator(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.admin.setCollaboratorActive(id, dto.active);
  }

  @UseGuards(SuperuserGuard)
  @Get('customers')
  customers() {
    return this.admin.customers();
  }

  @UseGuards(SuperuserGuard)
  @Post('customers')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.admin.createCustomer(dto);
  }

  @UseGuards(SuperuserGuard)
  @Patch('customers/:id')
  setCustomer(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.admin.setCustomerActive(id, dto.active);
  }

  @UseGuards(SuperuserGuard)
  @Get('providers')
  providers() {
    return this.admin.providers();
  }

  @UseGuards(SuperuserGuard)
  @Patch('providers/:id')
  setProvider(@Param('id') id: string, @Body() dto: ProviderDto) {
    return this.admin.setProvider(id, dto);
  }

  @UseGuards(SuperuserGuard)
  @Get('payment-options')
  paymentOptions() {
    return this.admin.paymentOptions();
  }

  @UseGuards(SuperuserGuard)
  @Patch('payment-options/:id')
  setPayment(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.admin.setPaymentOption(id, dto.active);
  }

  @UseGuards(SuperuserGuard)
  @Get('suppliers')
  suppliers() {
    return this.admin.suppliers();
  }

  @UseGuards(SuperuserGuard)
  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.admin.createSupplier(dto);
  }

  @UseGuards(SuperuserGuard)
  @Patch('suppliers/:id')
  setSupplier(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.admin.setSupplierActive(id, dto.active);
  }

  @UseGuards(SuperuserGuard)
  @Get('api-keys')
  apiKeys() {
    return this.admin.apiKeys();
  }

  @UseGuards(SuperuserGuard)
  @Post('api-keys')
  createKey(@Body() dto: CreateKeyDto) {
    return this.admin.createApiKey(dto.name);
  }

  @UseGuards(SuperuserGuard)
  @Patch('api-keys/:id')
  setKey(@Param('id') id: string, @Body() dto: ActiveDto) {
    return this.admin.setApiKeyActive(id, dto.active);
  }

  @UseGuards(SuperuserGuard)
  @Get('company')
  company() {
    return this.admin.company();
  }

  @UseGuards(SuperuserGuard)
  @Patch('company')
  updateCompany(@Body() dto: CompanyDto) {
    return this.admin.updateCompany(dto.name);
  }

  @UseGuards(SuperuserGuard)
  @Post('company/logos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2_000_000 } }))
  uploadLogo(@UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string }, @Body() dto: LogoDto) {
    return this.admin.saveLogo(dto.slot, file);
  }
}
