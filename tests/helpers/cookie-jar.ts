/**
 * Stands in for the browser's cookie store. next/headers only works inside a
 * real request, so integration tests mock it with this and keep everything
 * else - Zod, bcrypt, Prisma, the guards - running for real.
 */
export const cookieJar = new Map<string, string>();

export const fakeCookieStore = {
  get(name: string) {
    const value = cookieJar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set(name: string, value: string) {
    cookieJar.set(name, value);
  },
  delete(name: string) {
    cookieJar.delete(name);
  },
};
