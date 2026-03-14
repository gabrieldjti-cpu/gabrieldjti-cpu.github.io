import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Autenticação - SaaS E-commerce',
  description: 'Faça login ou crie uma conta',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
