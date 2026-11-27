import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable OTP columns. Existing rows stay valid.
 */
export class AddUserOtpFields1732702000000 implements MigrationInterface {
  name = 'AddUserOtpFields1732702000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "otp" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "otpExpiresAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "otpExpiresAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "otp"
    `);
  }
}
