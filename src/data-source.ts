import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from './authentication/user.entity.js';
import { buildPostgresOptions } from './config/database.config.js';

/**
 * TypeORM CLI entrypoint (migrations). Runs outside Nest DI, so it cannot
 * inject ConfigService — it reuses the same options builder with process.env.
 */
function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env may be absent in CI; rely on process.env instead
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));

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
