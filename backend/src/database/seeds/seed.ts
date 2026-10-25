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
    // This seed script is intended for development and testing purposes only. 
    // It creates default users and travel packages in the database. Please ensure that you do not use real user data 
    // or sensitive information when running this script in a production environment.

    const users = dataSource.getRepository(User);
    // Create default users with the specified roles and hashed passwords
    await saveUser(users, admin.email, admin.password, UserRole.ADMIN);
    await saveUser(users, agent.email, agent.password, UserRole.AGENT);
    await saveUser(users, customer.email, customer.password, UserRole.CUSTOMER);

    // Create default travel packages with the specified details
    const packages = dataSource.getRepository(Package);
    await savePackage(packages, {
      destination: 'Cancun, Mexico',
      startDate: dateAfterDays(90),
      endDate: dateAfterDays(97),
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
    await savePackage(packages, {
      destination: 'Rome, Italy',
      startDate: dateAfterDays(150),
      endDate: dateAfterDays(157),
      price: '1299.00',
      totalCapacity: 20,
    });
    await savePackage(packages, {
      destination: 'Tokyo, Japan',
      startDate: dateAfterDays(180),
      endDate: dateAfterDays(187),
      price: '1499.00',
      totalCapacity: 15,
    });
    await savePackage(packages, {
      destination: 'Sydney, Australia',
      startDate: dateAfterDays(210),
      endDate: dateAfterDays(217),
      price: '1599.00',
      totalCapacity: 10,
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
