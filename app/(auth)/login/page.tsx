'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader } from '@/components/Card';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess(true);
      // Limpa a query string
      window.history.replaceState({}, document.title, '/login');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (!result?.ok) {
        setError('Email ou senha inválidos');
        return;
      }

      // Redireciona para dashboard
      router.push('/dashboard');
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
          <p className="text-muted-foreground">Acesse sua conta</p>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="border-b-0">
            <h2 className="text-2xl font-semibold text-foreground">Entrar</h2>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Success Message */}
              {success && (
                <div className="p-3 bg-accent/10 border border-accent text-accent rounded-md text-sm">
                  ✓ Conta criada com sucesso! Faça login para continuar.
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

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
              />

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                Entrar
              </Button>

              {/* Link to Signup */}
              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Registre-se
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Demo (para testes):</p>
          <p>Email: demo@example.com</p>
          <p>Senha: Demo@123456</p>
        </div>
      </div>
    </div>
  );
}
