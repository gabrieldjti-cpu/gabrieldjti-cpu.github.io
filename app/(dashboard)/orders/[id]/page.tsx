'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/Button';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  shippingAddress: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: {
      name: string;
      price: number;
    };
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { data: order, isLoading, error } = useSWR(
    orderId ? `/api/orders/${orderId}` : null,
    fetcher
  );

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted mb-4">Pedido não encontrado</p>
          <Link href="/orders">
            <Button variant="primary">Voltar aos Pedidos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const shippingAddress = JSON.parse(order.shippingAddress || '{}');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/orders" className="text-primary hover:underline mb-4 inline-block">
            ← Voltar aos Pedidos
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            <span className="text-muted text-sm">
              {new Date(order.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Itens */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-background border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Itens do Pedido
              </h2>
              <div className="space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between pb-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-foreground font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-muted text-sm">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                    <p className="text-foreground font-medium">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Endereço de Entrega
              </h2>
              <div className="text-muted space-y-1">
                <p>{shippingAddress.fullName}</p>
                <p>{shippingAddress.address}</p>
                <p>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                </p>
                <p>{shippingAddress.phone}</p>
                <p>{shippingAddress.email}</p>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-background border border-border rounded-lg p-6 sticky top-20">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Resumo
              </h2>

              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <div className="flex justify-between text-muted">
                  <span>Subtotal:</span>
                  <span>R$ {order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Frete:</span>
                  <span>Grátis</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-foreground mb-6">
                <span>Total:</span>
                <span>R$ {order.total.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <p className="text-muted font-medium mb-1">Número do Pedido</p>
                  <p className="text-foreground font-mono">{order.id}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted font-medium mb-1">Data</p>
                  <p className="text-foreground">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
