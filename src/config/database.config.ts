import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseConfig( config: ConfigService,): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: Number(config.get<string>('DB_PORT')),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME', 'print_it_db'),
    autoLoadEntities: true,
    synchronize:false,
  };
}
