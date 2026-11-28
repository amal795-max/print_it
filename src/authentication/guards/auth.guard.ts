import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../../common/interfaces/session.interface.js';

interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionUser = request.session?.user;

    if (!sessionUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!sessionUser.isVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    request.user = sessionUser;
    return true;
  }
}
