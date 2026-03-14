import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getUserOrganizations } from '@/lib/permissions';

export async function GET() {
  try {
    const memberships = await getUserOrganizations();
    return NextResponse.json(memberships);
  } catch (error) {
    console.error('[API] Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar organizações' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { name, slug } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se o slug já existe
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Esse slug já está em uso' },
        { status: 400 }
      );
    }

    // Cria a organização
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating organization:', error);
    return NextResponse.json(
      { error: 'Falha ao criar organização' },
      { status: 500 }
    );
  }
}
