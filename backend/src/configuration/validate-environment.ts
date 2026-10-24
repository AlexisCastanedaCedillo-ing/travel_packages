type Environment = Record<string, unknown>;

const requiredVariables = [
  'POSTGRES_HOST',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'REDIS_HOST',
  'RABBITMQ_HOST',
  'RABBITMQ_USER',
  'RABBITMQ_PASSWORD',
  'JWT_SECRET',
] as const;

const portVariables = [
  'PORT',
  'POSTGRES_PORT',
  'REDIS_PORT',
  'RABBITMQ_PORT',
] as const;

export function validateEnvironment(
  environment: Environment,
): Environment {
  for (const name of requiredVariables) {
    if (typeof environment[name] !== 'string' || !environment[name].trim()) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }

  for (const name of portVariables) {
    const value = environment[name] ?? (name === 'PORT' ? '3000' : undefined);
    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Environment variable ${name} must be a valid port`);
    }

    environment[name] = port;
  }

  return environment;
}
