import type { UserRole } from '../../authentication/roles/user-role.enum.js';

/** User payload stored in the Express session (never includes password). */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
