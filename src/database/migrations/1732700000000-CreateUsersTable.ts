import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the users table for session authentication.
 * Safe for empty databases. Fully reversible via `down`.
 */
export class CreateUsersTable1732700000000 implements MigrationInterface {
  name = 'CreateUsersTable1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'CUSTOMER',
        "isVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
