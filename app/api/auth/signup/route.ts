import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validatePassword, generateSlug } from '@/lib/utils';
import { createUser, getUserByEmail } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validação
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Senha fraca', errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Verifica se usuário já existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário com esse email já existe' },
        { status: 409 }
      );
    }

    // Cria novo usuário
    const user = await createUser(email, password, name);

    // Cria organização padrão
    const organizationSlug = generateSlug(name || email.split('@')[0]);
    const organization = await prisma.organization.create({
      data: {
        name: name || email,
        slug: organizationSlug,
        planId: 'free',
      },
    });

    // Adiciona usuário como owner da organização
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    // Cria settings padrão
    await prisma.organizationSettings.create({
      data: {
        organizationId: organization.id,
      },
    });

    // Cria subscription no plano free
    const freePlan = await prisma.plan.findUnique({
      where: { type: 'FREE' },
    });

    if (freePlan) {
      await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          planType: 'FREE',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        organization,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
