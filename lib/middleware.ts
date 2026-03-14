import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canUserAccess, hasPermission } from './permissions';
import { Role } from '@prisma/client';

export async function withAuth(
  handler: (
    req: NextRequest,
    context: any
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    return handler(req, context);
  };
}

export async function withOrganization(
  handler: (
    req: NextRequest,
    context: any
  ) => Promise<NextResponse>,
  requiredRoles?: Role[]
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const organizationId = context.params?.organizationId ||
      new URL(req.url).searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID é obrigatório' },
        { status: 400 }
      );
    }

    const hasAccess = await canUserAccess(organizationId, requiredRoles);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}
