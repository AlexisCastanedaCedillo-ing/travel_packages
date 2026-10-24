import { hash } from 'bcrypt';
import { Repository } from 'typeorm';
import dataSource from '../data-source';
import { Package } from '../entities/package.entity';
import { User, UserRole } from '../entities/user.entity';

async function seed(): Promise<void> {
  const admin = requiredEnvironment('SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD');
  const agent = requiredEnvironment('SEED_AGENT_EMAIL', 'SEED_AGENT_PASSWORD');
  const customer = requiredEnvironment(
    'SEED_CUSTOMER_EMAIL',
    'SEED_CUSTOMER_PASSWORD',
  );
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    await saveUser(users, admin.email, admin.password, UserRole.ADMIN);
    await saveUser(users, agent.email, agent.password, UserRole.AGENT);
    await saveUser(users, customer.email, customer.password, UserRole.CUSTOMER);

    const packages = dataSource.getRepository(Package);
    const startDate = dateAfterDays(90);
    const endDate = dateAfterDays(97);
    await savePackage(packages, {
      destination: 'Cancun, Mexico',
      startDate,
      endDate,
      price: '899.00',
      totalCapacity: 25,
    });
    await savePackage(packages, {
      destination: 'Cusco, Peru',
      startDate: dateAfterDays(120),
      endDate: dateAfterDays(127),
      price: '1099.00',
      totalCapacity: 18,
    });
    console.info('Development users and travel packages were seeded.');
  } finally {
    await dataSource.destroy();
  }
}

function requiredEnvironment(
  emailKey: string,
  passwordKey: string,
): { email: string; password: string } {
  const email = process.env[emailKey]?.trim().toLowerCase();
  const password = process.env[passwordKey];
  if (!email || !password || password.length < 12) {
    throw new Error(
      `${emailKey} and ${passwordKey} are required; seed passwords must contain at least 12 characters`,
    );
  }
  return { email, password };
}

async function saveUser(
  users: Repository<User>,
  email: string,
  password: string,
  role: UserRole,
): Promise<void> {
  const user = (await users.findOneBy({ email })) ?? users.create({ email });
  user.password = await hash(password, 12);
  user.role = role;
  await users.save(user);
}

async function savePackage(
  packages: Repository<Package>,
  values: Pick<
    Package,
    'destination' | 'startDate' | 'endDate' | 'price' | 'totalCapacity'
  >,
): Promise<void> {
  const existing = await packages.findOneBy({
    destination: values.destination,
  });
  if (!existing) {
    await packages.save(
      packages.create({ ...values, availableSlots: values.totalCapacity }),
    );
  }
}

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

void seed().catch((error: unknown) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
