import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/lib/auth';

const prisma = new PrismaClient();

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
    },
  });
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  return user;
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function updateUser(userId: string, data: any) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
