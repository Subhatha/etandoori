import type { Staff } from './orders';
export class AccessError extends Error {
  constructor(public status: number) { super(status === 401 ? 'unauthorized' : 'forbidden'); }
}
export function bearerToken(header: string | null): string {
  if (!header || !/^Bearer \S{1,8192}$/.test(header)) throw new AccessError(401);
  return header.slice(7);
}
export function requireStaff(userId: string | undefined, member: Staff | null): Staff {
  if (!userId) throw new AccessError(401);
  if (!member || !['admin', 'staff'].includes(member.role)) throw new AccessError(403);
  return member;
}
