import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: organizationId ? { organizationId } : {},
      skip,
      take: limit,
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.product.count({
      where: organizationId ? { organizationId } : {},
    });

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching products:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { organizationId, name, description, price, stock, image } = data;

    if (!organizationId || !name || !price) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        image,
        organizationId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating product:', error);
    return NextResponse.json(
      { error: 'Falha ao criar produto' },
      { status: 500 }
    );
  }
}
