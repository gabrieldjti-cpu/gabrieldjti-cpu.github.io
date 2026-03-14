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
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: organization.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('[API] Error fetching members:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar membros' },
      { status: 500 }
    );
  }
}

export async function POST(
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
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email e role são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verifica se o usuário já é membro
    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Usuário já é membro' },
        { status: 400 }
      );
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('[API] Error adding member:', error);
    return NextResponse.json(
      { error: 'Falha ao adicionar membro' },
      { status: 500 }
    );
  }
}
