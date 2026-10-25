import { validateEnvironment } from './validate-environment';

describe('validateEnvironment', () => {
  const validEnvironment = () => ({
    POSTGRES_HOST: 'localhost',
    POSTGRES_DB: 'travel_packages',
    POSTGRES_USER: 'travel_user',
    POSTGRES_PASSWORD: 'test-password',
    REDIS_HOST: 'localhost',
    RABBITMQ_HOST: 'localhost',
    RABBITMQ_USER: 'travel_user',
    RABBITMQ_PASSWORD: 'test-password',
    JWT_SECRET: 'a-secure-test-secret-with-at-least-32-characters',
    POSTGRES_PORT: '5432',
    REDIS_PORT: '6379',
    RABBITMQ_PORT: '5672',
  });

  it('validates required settings, defaults the API port, and converts ports to numbers', () => {
    const environment = validateEnvironment(validEnvironment());

    expect(environment).toMatchObject({
      PORT: 3000,
      POSTGRES_PORT: 5432,
      REDIS_PORT: 6379,
      RABBITMQ_PORT: 5672,
    });
  });

  it('rejects missing or blank required variables', () => {
    const environment = validEnvironment();
    environment.POSTGRES_PASSWORD = ' ';

    expect(() => validateEnvironment(environment)).toThrow(
      'Missing required environment variable: POSTGRES_PASSWORD',
    );
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    const environment = validEnvironment();
    environment.JWT_SECRET = 'short';

    expect(() => validateEnvironment(environment)).toThrow(
      'Environment variable JWT_SECRET must be at least 32 characters',
    );
  });

  it.each(['0', '65536', 'not-a-port'])(
    'rejects invalid PostgreSQL port %s',
    (port) => {
      const environment = validEnvironment();
      environment.POSTGRES_PORT = port;

      expect(() => validateEnvironment(environment)).toThrow(
        'Environment variable POSTGRES_PORT must be a valid port',
      );
    },
  );
});
