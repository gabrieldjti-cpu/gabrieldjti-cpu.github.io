import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { monthlyPrice: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('[API] Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar planos' },
      { status: 500 }
    );
  }
}
