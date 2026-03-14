import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export async function getUserOrganization(organizationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Não autenticado');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new Error('Sem acesso a esta organização');
  }

  return membership;
}

export async function canUserAccess(
  organizationId: string,
  requiredRoles?: Role[]
) {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return false;
  }

  return true;
}

export async function getUserOrganizations() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Não autenticado');
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: true,
    },
  });

  return memberships;
}

export function hasPermission(role: Role, permission: string): boolean {
  const permissions: Record<Role, string[]> = {
    OWNER: [
      'read_org',
      'write_org',
      'delete_org',
      'manage_members',
      'manage_products',
      'view_orders',
      'manage_billing',
      'view_analytics',
    ],
    ADMIN: [
      'read_org',
      'write_org',
      'manage_members',
      'manage_products',
      'view_orders',
      'view_analytics',
    ],
    MANAGER: [
      'read_org',
      'manage_products',
      'view_orders',
      'view_analytics',
    ],
    SELLER: [
      'read_org',
      'manage_products',
      'view_orders',
    ],
    CUSTOMER: [
      'read_org',
      'view_orders',
    ],
  };

  return permissions[role]?.includes(permission) ?? false;
}
