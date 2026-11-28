import { configDotenv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './authentication/user.entity.js';
import { buildPostgresOptions } from './config/database.config.js';

/**
 * TypeORM CLI entrypoint (migrations). Runs outside Nest DI, so it cannot
 * inject ConfigService — it reuses the same options builder with process.env.
 */
configDotenv({ override: false, quiet: true });

const env = {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    return value as T;
  },
  getOrThrow<T = string>(key: string): T {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value as T;
  },
};

export default new DataSource({
  ...buildPostgresOptions(env),
  entities: [User],
  migrations: ['src/database/migrations/*.{ts,js}'],
});
