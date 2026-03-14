#!/usr/bin/env node

// Primária, precisamos rodar as migrações Prisma
// Este arquivo será executado manualmente via: npx ts-node scripts/init-db.ts

console.log('📦 Inicializando banco de dados...');
console.log('');
console.log('1. Execute: npx prisma migrate deploy');
console.log('2. Seed de dados padrão será criado...');
console.log('');
