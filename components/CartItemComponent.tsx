'use client';

import { Button } from './Button';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

interface CartItemProps {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  loading?: boolean;
}

export function CartItemComponent({
  id,
  productName,
  productImage,
  price,
  quantity,
  onUpdateQuantity,
  onRemove,
  loading = false,
}: CartItemProps) {
  const total = price * quantity;

  return (
    <div className="flex gap-4 p-4 bg-background border border-border rounded-lg">
      {/* Imagem */}
      {productImage && (
        <div className="relative w-20 h-20 flex-shrink-0">
          <Image
            src={productImage}
            alt={productName}
            fill
            className="object-cover rounded"
          />
        </div>
      )}

      {/* Informações */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{productName}</h3>
          <p className="text-sm text-muted">R$ {price.toFixed(2)}</p>
        </div>

        {/* Controles de Quantidade */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(id, Math.max(1, quantity - 1))}
            className="px-2 py-1 text-muted hover:text-foreground text-sm"
            disabled={quantity <= 1 || loading}
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => onUpdateQuantity(id, Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 text-center border border-border rounded px-1 py-1 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => onUpdateQuantity(id, quantity + 1)}
            className="px-2 py-1 text-muted hover:text-foreground text-sm"
            disabled={loading}
          >
            +
          </button>
        </div>
      </div>

      {/* Total e Remover */}
      <div className="flex flex-col items-end justify-between">
        <div className="text-lg font-bold text-foreground">
          R$ {total.toFixed(2)}
        </div>
        <button
          onClick={() => onRemove(id)}
          disabled={loading}
          className="p-2 text-muted hover:text-destructive transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
