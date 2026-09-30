import { randomUUID } from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { startTelemetry } from './infrastructure/logging/telemetry';

async function bootstrap() {
  await startTelemetry();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use((request: Request, response: Response, next: NextFunction) => {
    if ((request.method === 'GET' || request.method === 'HEAD') && request.path === '/') {
      response.redirect(302, '/api/docs');
      return;
    }
    next();
  });
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173' });
  app.use((request: Request & { requestId?: string }, response: Response, next: NextFunction) => {
    request.requestId = randomUUID();
    response.setHeader('x-request-id', request.requestId);
    next();
  });
  const hits = new Map<string, { count: number; reset: number }>();
  app.use('/api/v1/graphql', (request: Request, response: Response, next: NextFunction) => {
    const ip = request.ip ?? 'local';
    const now = Date.now();
    const current = hits.get(ip);
    if (!current || current.reset < now) {
      hits.set(ip, { count: 1, reset: now + 60_000 });
      next();
      return;
    }
    current.count += 1;
    if (current.count > 60) {
      response.status(429).json({ statusCode: 429, code: 'RATE_LIMIT', message: 'Muitas consultas GraphQL.' });
      return;
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('RetailFlow API').setDescription('Operação de varejo e crédito').setVersion('0.2.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(config.get<string>('API_PORT') ?? 3000);
}
void bootstrap();
