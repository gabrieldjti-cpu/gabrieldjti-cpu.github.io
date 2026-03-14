export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('A senha deve ter pelo menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }
  if (!/\d/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-')
    .slice(0, 50);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${timestamp.slice(-8)}-${random}`;
}
