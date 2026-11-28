import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/global.exception.filter.js';
import { createSessionMiddleware } from './config/session.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(await createSessionMiddleware(configService));

  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3001',
  );
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  if (configService.get<string>('NODE_ENV') === 'production') {
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.getInstance().set('trust proxy', 1);
  }

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerFile = new URL('../swagger.yaml', import.meta.url);
  const document = parse(await readFile(swaggerFile, 'utf8'));
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  const port = configService.get<string>('PORT') ?? process.env.PORT ?? '3002';
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
