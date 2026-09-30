import { hash, compare } from 'bcryptjs';
export async function digest(value: string | ArrayBuffer) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    typeof value === 'string' ? new TextEncoder().encode(value) : value,
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
export function passwordValid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    new TextEncoder().encode(value).length <= 72
  );
}
export const hashPassword = (password: string) => hash(password, 12);
export const checkPassword = (password: string, hashed: string) =>
  compare(password, hashed);
export const sessionToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
export function sameOrigin(request: Request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
export const publicUser = (user: Record<string, unknown>) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role,
  active: !!user.active,
  mustChange: !!user.must_change,
});
