import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthenticationModule } from './authentication/authentication.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { databaseConfig } from './config/database.config.js';


@Module({
  imports: [
     TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }), 
    AuthenticationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

