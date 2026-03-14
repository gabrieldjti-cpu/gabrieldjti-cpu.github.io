import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - SaaS E-commerce',
  description: 'Gerencie sua loja online',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
