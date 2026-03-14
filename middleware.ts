import { auth } from '@/auth';

export default auth((req) => {
  // O middleware do NextAuth já protege as rotas automaticamente
  // Você pode adicionar lógica customizada aqui se necessário
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)',
  ],
};
