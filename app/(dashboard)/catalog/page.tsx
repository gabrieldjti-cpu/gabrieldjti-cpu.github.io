'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ProductCard } from '@/components/ProductCard';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock: number;
}

export default function CatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useSWR(
    `/api/products?page=${page}&limit=12`,
    fetcher
  );

  const handleAddToCart = async (productId: string, quantity: number) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar ao carrinho');
      }

      toast.success('Produto adicionado ao carrinho!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(message);
    }
  };

  const products = data?.products || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Catálogo de Produtos
          </h1>
          <p className="text-muted">
            Explore nossa seleção de produtos de qualidade
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive mb-6">
            Erro ao carregar produtos. Tente novamente.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted text-lg">Nenhum produto disponível.</p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {products.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  image={product.image}
                  stock={product.stock}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded ${
                          page === p
                            ? 'bg-primary text-white'
                            : 'border border-border hover:bg-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 border border-border rounded disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
