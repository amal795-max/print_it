import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../interfaces/session.interface.js';

interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

/**
 * Extracts the authenticated session user from the request.
 * Pass a property name to return a single field (e.g. `@CurrentUser('id')`).
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user ?? request.session?.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
