import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Iniciando el sembrado de datos (seeding)...');

  // 1. Limpiar la base de datos (Opcional, evita duplicados al re-ejecutar)
  // El orden es importante por las llaves foráneas
  await prisma.postCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Encriptar la contraseña para el usuario
  const salt = await bcrypt.genSalt(10);
  const hashedAdminPassword = await bcrypt.hash('admin123', salt);
  const hashedUserPassword = await bcrypt.hash('user123', salt);

  // 3. Crear un Tenant (Relación 1 a N con User)
  const mainTenant = await prisma.tenant.create({
    data: {
      name: 'Corporación Nicaragua Tech',
    },
  });

  // 4. Crear un Usuario Administrador con su Perfil (Relación 1 a 1)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nigatech.com',
      name: 'Admin Principal',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      tenantId: mainTenant.id,
      profile: {
        create: {
          bio: 'Administrador del sistema y desarrollador senior.',
        },
      },
    },
  });

  // 5. Crear un Usuario Estándar
  await prisma.user.create({
    data: {
      email: 'estudiante@uam.com',
      name: 'Juan Pérez',
      password: hashedUserPassword,
      role: Role.USER,
      tenantId: mainTenant.id,
      profile: {
        create: {
          bio: 'Estudiante de 4to año de Ingeniería de Sistemas.',
        },
      },
    },
  });

  // 6. Crear Categorías para los Posts
  const catSoftware = await prisma.category.create({
    data: { name: 'Desarrollo de Software' },
  });
  const catCyber = await prisma.category.create({
    data: { name: 'Ciberseguridad' },
  });
  const catDatabase = await prisma.category.create({
    data: { name: 'Bases de Datos' },
  });

  // 7. Crear un Post y relacionarlo (Relación N a N mediante PostCategory)
  const post = await prisma.post.create({
    data: {
      title: 'Guía definitiva de Prisma y Docker en macOS',
    },
  });

  await prisma.postCategory.createMany({
    data: [
      { postId: post.id, categoryId: catSoftware.id },
      { postId: post.id, categoryId: catDatabase.id },
    ],
  });

  console.log('✅ Base de datos sembrada con éxito.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en el seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
