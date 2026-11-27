import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller.js';
import { AuthenticationController } from './authentication.controller.js';
import { AuthenticationService } from './authentication.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RolesGuard } from './roles/roles.guard.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthenticationController, AdminController],
  providers: [AuthenticationService, UsersService, AuthGuard, RolesGuard],
  exports: [AuthenticationService, UsersService, AuthGuard, RolesGuard],
})
export class AuthenticationModule {}
