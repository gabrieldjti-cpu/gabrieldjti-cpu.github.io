import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="container flex items-center justify-between py-4 md:py-6">
        <div className="text-2xl font-bold text-primary">SaaS Commerce</div>
        <div className="flex gap-4">
          <Link href="/login" className="btn-outline">
            Entrar
          </Link>
          <Link href="/signup" className="btn-primary">
            Começar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 text-balance">
          Plataforma de E-commerce Escalável para SaaS
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
          Gerencie múltiplas lojas, produtos, pedidos e pagamentos com uma plataforma moderna,
          segura e preparada para crescer com seu negócio.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/signup" className="btn-primary text-lg px-8 py-3">
            Comece Gratuitamente
          </Link>
          <Link href="#features" className="btn-outline text-lg px-8 py-3">
            Ver Recursos
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20 md:py-32">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Recursos Principais</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Multi-tenancy',
              description: 'Gerencie múltiplas organizações e lojas em uma única plataforma',
            },
            {
              title: 'RBAC Completo',
              description: 'Sistema de permissões granulares com roles e controle de acesso',
            },
            {
              title: 'Pagamentos Integrados',
              description: 'Stripe integrado para processar pagamentos com segurança',
            },
            {
              title: 'Gestão de Produtos',
              description: 'Catálogo completo com inventory, preços e categorias',
            },
            {
              title: 'Pedidos em Tempo Real',
              description: 'Acompanhamento de pedidos com status e histórico completo',
            },
            {
              title: 'Planos Tiered',
              description: 'Monetize com planos Free, Starter, Professional e Enterprise',
            },
          ].map((feature, i) => (
            <div key={i} className="card p-6">
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Crie sua conta em minutos e comece a vender online.
        </p>
        <Link href="/signup" className="btn-primary text-lg px-8 py-3">
          Criar Conta Gratuitamente
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-20">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 SaaS E-commerce Platform. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
