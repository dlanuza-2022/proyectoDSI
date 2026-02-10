import { PrismaClient, Role } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db', // tu DB en la raíz
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando el sembrado de datos...');

  // --- Limpieza de datos anteriores ---
  try {
    // El orden es importante para no romper las llaves foráneas
    await prisma.postCategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.post.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    console.log('🗑️  Datos antiguos eliminados.');
  } catch (error) {
    console.log(
      '⚠️  La base de datos estaba vacía o hubo un error al limpiar (continuando...)',
    );
  }

  // --- Encriptación ---
  const salt = await bcrypt.genSalt(10);
  const hashedAdminPassword = await bcrypt.hash('admin123', salt);
  const hashedUserPassword = await bcrypt.hash('user123', salt);

  // --- Creación de datos ---

  // 1. Tenant
  const mainTenant = await prisma.tenant.create({
    data: { name: 'Corporación Nicaragua Tech' },
  });

  // 2. Admin
  await prisma.user.create({
    data: {
      email: 'admin@nigatech.com',
      name: 'Admin Principal',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      tenantId: mainTenant.id,
      profile: {
        create: { bio: 'Administrador del sistema.' },
      },
    },
  });

  // 3. Usuario Normal
  await prisma.user.create({
    data: {
      email: 'estudiante@uam.com',
      name: 'Juan Pérez',
      password: hashedUserPassword,
      role: Role.USER,
      tenantId: mainTenant.id,
      profile: {
        create: { bio: 'Estudiante de sistemas.' },
      },
    },
  });

  // 4. Categorías
  const catSoftware = await prisma.category.create({
    data: { name: 'Desarrollo' },
  });
  const catCyber = await prisma.category.create({
    data: { name: 'Ciberseguridad' },
  });

  // 5. Post
  const post = await prisma.post.create({
    data: {
      title: 'Tutorial de Prisma',
    },
  });

  // 6. Relación N-N
  await prisma.postCategory.createMany({
    data: [
      { postId: post.id, categoryId: catSoftware.id },
      { postId: post.id, categoryId: catCyber.id },
    ],
  });

  console.log('✅ Base de datos sembrada con éxito.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
