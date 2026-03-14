import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Dashboard - SaaS E-commerce',
  description: 'Gerencie sua loja online',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
