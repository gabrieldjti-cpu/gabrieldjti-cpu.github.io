'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import useSWR from 'swr';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: cart } = useSWR('/api/cart', fetcher);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const items = cart?.items || [];
  const total = items.reduce((sum: number, item: CartItem) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.address) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsProcessing(true);
    try {
      // Aqui você integraria com a API de pagamento (Stripe)
      // Por agora, simulamos um pedido bem-sucedido
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
          },
          total,
          status: 'pending',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pedido');
      }

      const order = await response.json();
      toast.success('Pedido criado com sucesso!');
      router.push(`/orders/${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pedido';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted mb-4">Seu carrinho está vazio</p>
          <Button onClick={() => router.push('/catalog')} variant="primary">
            Voltar ao Catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Dados Pessoais
                </h2>
                <div className="space-y-3">
                  <Input
                    type="text"
                    name="fullName"
                    placeholder="Nome Completo *"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="Telefone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Endereço de Entrega
                </h2>
                <div className="space-y-3">
                  <Input
                    type="text"
                    name="address"
                    placeholder="Rua, número e complemento *"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    type="text"
                    name="city"
                    placeholder="Cidade"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      name="state"
                      placeholder="Estado"
                      value={formData.state}
                      onChange={handleInputChange}
                    />
                    <Input
                      type="text"
                      name="zipCode"
                      placeholder="CEP"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Dados de Pagamento
                </h2>
                <div className="space-y-3">
                  <Input
                    type="text"
                    name="cardNumber"
                    placeholder="Número do Cartão"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      name="cardExpiry"
                      placeholder="MM/AA"
                      value={formData.cardExpiry}
                      onChange={handleInputChange}
                    />
                    <Input
                      type="text"
                      name="cardCvc"
                      placeholder="CVC"
                      value={formData.cardCvc}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processando...' : 'Finalizar Compra'}
              </Button>
            </form>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-background border border-border rounded-lg p-6 sticky top-20">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-3 mb-4 pb-4 border-b border-border max-h-96 overflow-y-auto">
                {items.map((item: CartItem) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <div>
                      <p className="text-foreground font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-muted text-xs">
                        Qtd: {item.quantity}
                      </p>
                    </div>
                    <p className="text-foreground font-medium">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-muted">
                  <span>Subtotal:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Frete:</span>
                  <span>Grátis</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-foreground pt-4 border-t border-border">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
