'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader } from '@/components/Card';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-50">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {session?.user?.name}!
          </h2>
          <p className="text-muted-foreground">
            Aqui você pode gerenciar seus produtos, pedidos e configurações.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Produtos', href: '#', count: 0 },
            { title: 'Pedidos', href: '#', count: 0 },
            { title: 'Clientes', href: '#', count: 0 },
            { title: 'Vendas', href: '#', count: '$0' },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary mb-2">
                  {item.count}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{item.title}</p>
                <Link href={item.href} className="text-sm text-primary hover:underline">
                  Ver detalhes →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Em Breve</h3>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Estamos desenvolvendo os seguintes recursos:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-primary rounded-full mr-3"></span>
                Gestão completa de produtos
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-primary rounded-full mr-3"></span>
                Rastreamento de pedidos
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-primary rounded-full mr-3"></span>
                Relatórios de vendas
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-primary rounded-full mr-3"></span>
                Integração de pagamentos
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
