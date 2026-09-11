import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lawyer } from '../lawyers/lawyer.entity';
import { DepositFile } from '../files/deposit-file.entity';
import { DepositRequestStatus } from './request-status.enum';

/**
 * `status` persists only the "explicit" states (PENDING/COMPLETE) that are
 * not a pure function of time. EXPIRED is always derived at read time by
 * RequestStatusService so that a request never "misses" its expiry because
 * nothing wrote to the row. See RequestStatusService.compute().
 */
@Entity('deposit_requests')
export class DepositRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lawyer, (lawyer) => lawyer.requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lawyerId' })
  lawyer: Lawyer;

  @Column()
  lawyerId: string;

  @Column()
  title: string;

  @Index({ unique: true })
  @Column()
  token: string;

  @Column()
  pinHash: string;

  @Column({ type: 'int', default: 1 })
  requiredCount: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'enum', enum: DepositRequestStatus, default: DepositRequestStatus.PENDING })
  status: DepositRequestStatus.PENDING | DepositRequestStatus.COMPLETE;

  @Column({ type: 'int', default: 0 })
  pinFailedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  pinLockedUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DepositFile, (file) => file.request)
  files: DepositFile[];
}
