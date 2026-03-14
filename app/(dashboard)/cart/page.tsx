'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartItemComponent } from '@/components/CartItemComponent';
import { Button } from '@/components/Button';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
}

export default function CartPage() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const { data: cart, isLoading } = useSWR('/api/cart', fetcher);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await handleRemoveItem(itemId);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      mutate('/api/cart');
      toast.success('Quantidade atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar quantidade');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao remover');

      mutate('/api/cart');
      toast.success('Produto removido do carrinho');
    } catch (err) {
      toast.error('Erro ao remover produto');
    } finally {
      setIsUpdating(false);
    }
  };

  const items = cart?.items || [];
  const total = items.reduce((sum: number, item: CartItem) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Carrinho de Compras
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg mb-6">Seu carrinho está vazio</p>
            <Link href="/catalog">
              <Button variant="primary">Continuar Comprando</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Itens */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item: CartItem) => (
                <CartItemComponent
                  key={item.id}
                  id={item.id}
                  productId={item.productId}
                  productName={item.product.name}
                  productImage={item.product.image}
                  price={item.product.price}
                  quantity={item.quantity}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  loading={isUpdating}
                />
              ))}
            </div>

            {/* Resumo */}
            <div className="lg:col-span-1">
              <div className="bg-background border border-border rounded-lg p-6 sticky top-20">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Resumo
                </h2>

                <div className="space-y-2 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Frete:</span>
                    <span>Calcular</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold text-foreground mb-6">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>

                <Button
                  variant="primary"
                  className="w-full mb-2"
                  onClick={() => router.push('/checkout')}
                >
                  Ir para Checkout
                </Button>

                <Link href="/catalog">
                  <Button variant="outline" className="w-full">
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
