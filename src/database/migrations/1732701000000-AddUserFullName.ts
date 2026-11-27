import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds fullName to users. Safe additive change with a default for existing rows.
 */
export class AddUserFullName1732701000000 implements MigrationInterface {
  name = 'AddUserFullName1732701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "fullName" character varying NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "fullName"
    `);
  }
}
