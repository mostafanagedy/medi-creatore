const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function check() {
  const email = 'admin@ai-content-os.dev';
  const password = 'Admin@123456';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found!');
    return;
  }
  console.log('User found:', user.email);
  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('Password valid?', isValid);
}
check().finally(() => prisma.$disconnect());
