'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './Button';
import { Menu, X, ShoppingCart, User } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectTo: '/' });
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-primary">
              SuperMarket
            </span>
          </Link>

          {/* Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {session ? (
              <>
                <Link href="/catalog" className="text-foreground hover:text-primary transition-colors">
                  Catálogo
                </Link>
                <Link href="/cart" className="text-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Carrinho
                </Link>
                <Link href="/orders" className="text-foreground hover:text-primary transition-colors">
                  Pedidos
                </Link>
                <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <User size={20} />
                  {session.user?.name || 'Perfil'}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary">Cadastro</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            {isOpen ? (
              <X size={24} className="text-foreground" />
            ) : (
              <Menu size={24} className="text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {session ? (
              <>
                <Link href="/catalog" className="block px-3 py-2 text-foreground hover:bg-secondary rounded">
                  Catálogo
                </Link>
                <Link href="/cart" className="block px-3 py-2 text-foreground hover:bg-secondary rounded">
                  Carrinho
                </Link>
                <Link href="/orders" className="block px-3 py-2 text-foreground hover:bg-secondary rounded">
                  Pedidos
                </Link>
                <Link href="/dashboard" className="block px-3 py-2 text-foreground hover:bg-secondary rounded">
                  Perfil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 text-foreground hover:bg-secondary rounded"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/signup" className="block px-3 py-2">
                  <Button variant="primary" className="w-full">Cadastro</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
