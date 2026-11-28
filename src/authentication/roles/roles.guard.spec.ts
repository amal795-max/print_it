import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from './roles.decorator.js';
import { UserRole } from './user-role.enum.js';

describe('RolesGuard', () => {
  const defaultHandler = () => undefined;
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  const createContext = (
    role?: UserRole,
    handler = defaultHandler,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => RolesGuard,
      switchToHttp: () => ({
        getRequest: () => ({
          user: role === undefined ? undefined : { role },
        }),
      }),
    }) as ExecutionContext;

  it('allows routes without role metadata', () => {
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user whose role is permitted', () => {
    const handler = () => undefined;
    Reflect.defineMetadata(ROLES_KEY, [UserRole.ADMIN], handler);

    expect(guard.canActivate(createContext(UserRole.ADMIN, handler))).toBe(true);
  });

  it('denies users without a permitted role', () => {
    const handler = () => undefined;
    Reflect.defineMetadata(ROLES_KEY, [UserRole.ADMIN], handler);

    expect(guard.canActivate(createContext(UserRole.CUSTOMER, handler))).toBe(false);
    expect(guard.canActivate(createContext(undefined, handler))).toBe(false);
  });
});
