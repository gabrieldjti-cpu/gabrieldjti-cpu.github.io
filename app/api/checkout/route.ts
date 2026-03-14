import { auth } from '@/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { organizationId, planId } = await request.json();

    if (!organizationId || !planId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = `${origin}/org/${organizationId}/billing`;

    const checkoutSession = await createCheckoutSession(
      organizationId,
      planId,
      session.user.email,
      returnUrl
    );

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('[API] Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Falha ao criar sessão de checkout' },
      { status: 500 }
    );
  }
}
