import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { DatabaseInterceptor } from './common/interceptors/database.interceptor';
import { AuditModule } from './infrastructure/audit/audit.module';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { loadRootEnv } from './load-env';
import { AuditLogModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { HealthModule } from './modules/health/health.module';
import { StoresModule } from './modules/stores/stores.module';
import { UsersModule } from './modules/users/users.module';

loadRootEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [join(__dirname, '../../../.env'), join(__dirname, '../../.env'), '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    UsersModule,
    StoresModule,
    CustomersModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: DatabaseInterceptor },
  ],
})
export class AppModule {}
