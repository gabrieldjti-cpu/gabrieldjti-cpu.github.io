'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/Button';
import { Users, Package, ShoppingCart, TrendingUp } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OrganizationDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: organization, isLoading } = useSWR(
    slug ? `/api/organizations/${slug}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted">Organização não encontrada</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Membros',
      value: organization.members?.length || 0,
      icon: Users,
      href: `/org/${slug}/members`,
    },
    {
      label: 'Produtos',
      value: organization.products?.length || 0,
      icon: Package,
      href: `/org/${slug}/products`,
    },
    {
      label: 'Pedidos',
      value: 0,
      icon: ShoppingCart,
    },
    {
      label: 'Receita',
      value: 'R$ 0,00',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {organization.name}
          </h1>
          <p className="text-muted">Bem-vindo ao dashboard da sua loja</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const StatCard = (
              <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-muted text-sm font-medium">{stat.label}</h3>
                  <Icon size={20} className="text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            );

            return stat.href ? (
              <Link key={stat.label} href={stat.href}>
                {StatCard}
              </Link>
            ) : (
              <div key={stat.label}>{StatCard}</div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Ações Rápidas
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href={`/org/${slug}/products`}>
              <Button variant="primary">Gerenciar Produtos</Button>
            </Link>
            <Link href={`/org/${slug}/members`}>
              <Button variant="outline">Gerenciar Membros</Button>
            </Link>
            <Link href={`/org/${slug}/settings`}>
              <Button variant="outline">Configurações</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
