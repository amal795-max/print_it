import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/global.exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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

  const port = process.env.PORT ?? 3002;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();