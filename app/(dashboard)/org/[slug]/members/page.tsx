'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: organization } = useSWR(
    `/api/organizations/${slug}`,
    fetcher
  );
  const { data: members, isLoading } = useSWR(
    slug ? `/api/organizations/${slug}/members` : null,
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'SELLER' });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch(`/api/organizations/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success('Membro adicionado com sucesso!');
      setFormData({ email: '', role: 'SELLER' });
      setShowForm(false);
      mutate(`/api/organizations/${slug}/members`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar membro';
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const response = await fetch(
        `/api/organizations/${slug}/members/${memberId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success('Membro removido com sucesso!');
      mutate(`/api/organizations/${slug}/members`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover membro';
      toast.error(message);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${slug}/members/${memberId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success('Função atualizada!');
      mutate(`/api/organizations/${slug}/members`);
    } catch (err) {
      toast.error('Erro ao atualizar função');
    }
  };

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
              {organization?.name}
            </h1>
            <p className="text-muted">Gerencie os membros da sua organização</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : 'Adicionar Membro'}
          </Button>
        </div>

        {/* Adicionar Membro */}
        {showForm && (
          <div className="bg-background border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Adicionar Novo Membro
            </h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <Input
                type="email"
                placeholder="Email do usuário"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              >
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="SELLER">Seller</option>
                <option value="CUSTOMER">Customer</option>
              </select>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAdding}
                >
                  {isAdding ? 'Adicionando...' : 'Adicionar'}
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

        {/* Lista de Membros */}
        {(members || []).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">Nenhum membro adicionado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member: Member) => (
              <div
                key={member.id}
                className="bg-background border border-border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {member.user.name}
                  </p>
                  <p className="text-muted text-sm">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleUpdateRole(member.id, e.target.value)
                    }
                    className="px-3 py-1 border border-border rounded bg-background text-foreground text-sm"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SELLER">Seller</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-muted hover:text-destructive transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
