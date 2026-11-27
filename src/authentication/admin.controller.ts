import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthenticationService } from './authentication.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { Roles } from './roles/roles.decorator.js';
import { RolesGuard } from './roles/roles.guard.js';
import { UserRole } from './roles/user-role.enum.js';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Get('users')
  @Roles(UserRole.ADMIN)
  findAllUsers() {
    return this.authenticationService.findAllUsers();
  }
}
