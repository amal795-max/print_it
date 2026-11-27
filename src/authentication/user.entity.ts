import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from './roles/user-role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  otp!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  otpExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
