'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from './Button';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock: number;
  onAddToCart: (productId: string, quantity: number) => Promise<void>;
  loading?: boolean;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  image,
  stock,
  onAddToCart,
  loading = false,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (quantity <= 0 || stock <= 0) return;
    
    setIsAdding(true);
    try {
      await onAddToCart(id, quantity);
      setQuantity(1);
    } finally {
      setIsAdding(false);
    }
  };

  const isOutOfStock = stock <= 0;

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem */}
      {image && (
        <div className="relative w-full h-48 bg-secondary">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-lg text-foreground truncate">
          {name}
        </h3>
        
        {description && (
          <p className="text-sm text-muted mt-2 line-clamp-2">
            {description}
          </p>
        )}

        {/* Preço e Stock */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-xl font-bold text-primary">
            R$ {price.toFixed(2)}
          </span>
          <span className="text-xs text-muted">
            {isOutOfStock ? 'Fora de estoque' : `${stock} em estoque`}
          </span>
        </div>

        {/* Controles */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          {!isOutOfStock && (
            <>
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-1 text-muted hover:text-foreground text-sm"
                  disabled={quantity <= 1 || isAdding}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center border border-border rounded px-1 py-1 text-sm"
                  disabled={isAdding}
                />
                <button
                  onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                  className="px-2 py-1 text-muted hover:text-foreground text-sm"
                  disabled={quantity >= stock || isAdding}
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={isAdding || loading}
                variant="primary"
                size="sm"
              >
                {isAdding ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </>
          )}
          {isOutOfStock && (
            <div className="w-full text-center text-muted text-sm py-2">
              Indisponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
