import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { canUserAccess } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await params;
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
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const { role } = await request.json();

    const member = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('[API] Error updating member:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar membro' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await params;
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
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Previne que o último owner seja removido
    const memberToDelete = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (memberToDelete?.role === 'OWNER') {
      const owners = await prisma.organizationMember.count({
        where: {
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      if (owners === 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o último owner' },
          { status: 400 }
        );
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error removing member:', error);
    return NextResponse.json(
      { error: 'Falha ao remover membro' },
      { status: 500 }
    );
  }
}
