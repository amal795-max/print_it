import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

type EnvReader = {
  get<T = string>(key: string): T | undefined;
  get<T = string>(key: string, defaultValue: T): T;
  getOrThrow<T = string>(key: string): T;
};

/**
 * Shared Postgres options used by Nest TypeORM and the TypeORM CLI DataSource.
 */
export function buildPostgresOptions(env: EnvReader): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.get<string>('DB_HOST', 'localhost'),
    port: Number(env.get<string>('DB_PORT', '5432')),
    username: env.get<string>('DB_USERNAME', 'postgres'),
    password: env.getOrThrow<string>('DB_PASSWORD'),
    database: env.get<string>('DB_NAME', 'print_it_db'),
    synchronize: false,
  };
}

/** Nest runtime TypeORM config (uses ConfigService). */
export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    ...buildPostgresOptions(config),
    autoLoadEntities: true,
  };
}
