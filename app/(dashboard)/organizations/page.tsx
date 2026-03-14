'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function OrganizationsPage() {
  const { data: memberships, isLoading } = useSWR(
    '/api/organizations',
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success('Organização criada com sucesso!');
      setFormData({ name: '', slug: '' });
      setShowForm(false);
      mutate('/api/organizations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar organização';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const organizations = memberships?.map((m: any) => m.organization) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Organizações
            </h1>
            <p className="text-muted">
              Gerencie suas lojas e equipes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : 'Nova Organização'}
          </Button>
        </div>

        {/* Criar Organização */}
        {showForm && (
          <div className="bg-background border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Criar Nova Organização
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Nome da Organização"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <Input
                type="text"
                placeholder="Slug (ex: minha-loja)"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                required
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Organizações */}
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">
              Você não tem nenhuma organização
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org: Organization) => (
              <Link key={org.id} href={`/org/${org.slug}`}>
                <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {org.name}
                  </h3>
                  <p className="text-muted text-sm mb-4">
                    {org.slug}
                  </p>
                  <Button variant="outline" className="w-full">
                    Abrir
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
