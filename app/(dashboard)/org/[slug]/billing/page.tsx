'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PricingCards } from '@/components/PricingCards';
import { Button } from '@/components/Button';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
}

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: organization } = useSWR(
    slug ? `/api/organizations/${slug}` : null,
    fetcher
  );

  const { data: plansData } = useSWR('/api/subscription-plans', fetcher);

  const plans: SubscriptionPlan[] = plansData || [];

  const handleSelectPlan = async (planId: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          planId,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar checkout');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link href={`/org/${slug}`} className="text-primary hover:underline mb-4 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Planos e Preços
          </h1>
          <p className="text-muted text-lg">
            Escolha o plano ideal para sua loja
          </p>
        </div>

        {/* Pricing Cards */}
        {plans.length > 0 ? (
          <PricingCards
            plans={plans}
            onSelectPlan={handleSelectPlan}
            isLoading={isProcessing}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted">Carregando planos...</p>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Perguntas Frequentes
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">
                  Posso mudar de plano?
                </p>
                <p className="text-muted text-sm">
                  Sim, você pode mudar de plano a qualquer momento. A mudança
                  será refletida no seu próximo ciclo de faturamento.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Como funciona o cancelamento?
                </p>
                <p className="text-muted text-sm">
                  Você pode cancelar sua assinatura a qualquer momento. Nenhuma
                  cobrança adicional será feita.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Precisei de ajuda?
                </p>
                <p className="text-muted text-sm">
                  Entre em contato com nosso suporte através do email
                  support@supermarket.com.br
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Incluído em todos os planos
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Catálogo ilimitado de produtos</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Dashboard e relatórios</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Integração com múltiplos pagamentos</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Suporte por email</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Certificado SSL seguro</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted">Backup automático diário</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
