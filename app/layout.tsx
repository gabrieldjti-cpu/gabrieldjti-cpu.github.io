import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from './providers';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'] });
const geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SaaS E-commerce Platform',
  description: 'Plataforma de e-commerce escalável com multi-tenancy',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
