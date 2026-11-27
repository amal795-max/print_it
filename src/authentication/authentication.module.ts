import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './authentication.service.js';
import { AuthenticationController } from './authentication.controller.js';
import { User } from './entities/user.entity.js';
import { RolesGuard } from './roles/roles.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, RolesGuard],
  exports: [RolesGuard],
})
export class AuthenticationModule {}
