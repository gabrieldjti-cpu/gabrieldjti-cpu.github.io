import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('[API] Error fetching product:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, description, price, stock, image } = data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        image,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('[API] Error updating product:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar produto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting product:', error);
    return NextResponse.json(
      { error: 'Falha ao deletar produto' },
      { status: 500 }
    );
  }
}
