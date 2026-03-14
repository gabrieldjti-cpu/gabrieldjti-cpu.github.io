'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader } from '@/components/Card';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação básica
    if (!formData.email || !formData.password || !formData.name) {
      setError('Todos os campos são obrigatórios');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não correspondem');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Erro ao criar conta');
        return;
      }

      // Redireciona para login
      router.push('/login?success=true');
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">SaaS Commerce</h1>
          <p className="text-muted-foreground">Crie sua conta gratuitamente</p>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="border-b-0">
            <h2 className="text-2xl font-semibold text-foreground">Registro</h2>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <Input
                label="Nome"
                name="name"
                type="text"
                placeholder="João Silva"
                value={formData.name}
                onChange={handleChange}
                required
              />

              {/* Email */}
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              {/* Password */}
              <Input
                label="Senha"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                helperText="Mínimo 8 caracteres"
              />

              {/* Confirm Password */}
              <Input
                label="Confirmar Senha"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                Criar Conta
              </Button>

              {/* Link to Login */}
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Faça login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao se registrar, você concorda com nossos{' '}
          <Link href="#" className="text-primary hover:underline">
            Termos de Serviço
          </Link>
          {' '}e{' '}
          <Link href="#" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
