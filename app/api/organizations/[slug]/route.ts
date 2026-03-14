import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { canUserAccess } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        products: {
          take: 5,
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    const hasAccess = await canUserAccess(organization.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('[API] Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar organização' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    const hasAccess = await canUserAccess(organization.id, ['OWNER', 'ADMIN']);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Sem permissão para editar' },
        { status: 403 }
      );
    }

    const { name } = await request.json();

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: { name },
      include: {
        members: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Error updating organization:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar organização' },
      { status: 500 }
    );
  }
}
