import { prisma } from "./prisma";

export const EXPLICIT_ADMIN_EMAILS = [
  (process.env.ADMIN_EMAIL || "adm@adm.com").toLowerCase().trim(),
  "guilherme.oliveirasantos@hotmail.com",
];

export function isExplicitAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return EXPLICIT_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Verifica se o usuário é administrador de forma estrita:
 * somente se `user.isAdmin === true` no banco (ou e-mail exato do proprietário).
 * Nunca aceita substring genérica como `.includes("adm")`.
 */
export async function checkIsAdminUser(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, email: true },
  });
  if (!user) return false;
  return Boolean(user.isAdmin === true || isExplicitAdminEmail(user.email));
}

