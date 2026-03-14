'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/Button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useSWR('/api/orders', fetcher);

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

  const ordersList = orders || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Meus Pedidos
          </h1>
          <p className="text-muted">
            Acompanhe o status dos seus pedidos
          </p>
        </div>

        {ordersList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg mb-6">Você ainda não fez nenhum pedido</p>
            <Link href="/catalog">
              <Button variant="primary">Começar a Comprar</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ordersList.map((order: Order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Pedido #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-muted text-sm">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-muted text-sm">Total</p>
                        <p className="text-xl font-bold text-foreground">
                          R$ {order.total.toFixed(2)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
