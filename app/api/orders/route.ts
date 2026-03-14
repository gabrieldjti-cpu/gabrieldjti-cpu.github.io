import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[API] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar pedidos' },
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

    const { shippingAddress, total } = await request.json();

    // Busca o carrinho do usuário
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    // Cria o pedido
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        status: 'pending',
        total,
        shippingAddress: JSON.stringify(shippingAddress),
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: 0, // Será preenchido com o preço do produto
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Limpa o carrinho após criar o pedido
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating order:', error);
    return NextResponse.json(
      { error: 'Falha ao criar pedido' },
      { status: 500 }
    );
  }
}
