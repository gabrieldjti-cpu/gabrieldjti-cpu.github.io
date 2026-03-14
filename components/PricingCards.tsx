'use client';

import { Button } from './Button';
import { Check } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  popular?: boolean;
}

interface PricingCardsProps {
  plans: PricingPlan[];
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
}

export function PricingCards({
  plans,
  onSelectPlan,
  isLoading = false,
}: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-lg border p-8 transition-all ${
            plan.popular
              ? 'border-primary shadow-lg scale-105'
              : 'border-border'
          } bg-background`}
        >
          {plan.popular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                Mais Popular
              </span>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {plan.name}
            </h3>
            <p className="text-muted text-sm">{plan.description}</p>
          </div>

          <div className="mb-6">
            <span className="text-4xl font-bold text-foreground">
              R$ {plan.monthlyPrice.toFixed(0)}
            </span>
            <span className="text-muted text-sm">/mês</span>
          </div>

          <Button
            onClick={() => onSelectPlan(plan.id)}
            disabled={isLoading}
            variant={plan.popular ? 'primary' : 'outline'}
            className="w-full mb-6"
          >
            {isLoading ? 'Processando...' : 'Escolher Plano'}
          </Button>

          <div className="space-y-3">
            {plan.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check size={18} className="text-primary flex-shrink-0" />
                <span className="text-muted text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
