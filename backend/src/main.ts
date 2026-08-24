import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get<string>('frontendOrigin');
  const port = configService.get<number>('port') ?? 4000;

  // Middleware
  app.use(cookieParser());

  // CORS for HTTP — allows frontend origin with credentials (HTTP-only cookies)
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Global exception filter — normalizes all error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(port);
  console.log(`Langro backend running on http://localhost:${port}`);
  console.log(`Accepting requests from: ${frontendOrigin}`);
}

bootstrap();
