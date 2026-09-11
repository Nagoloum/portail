import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DepositRequest } from '../requests/deposit-request.entity';

export enum DepositFileStatus {
  PENDING = 'PENDING', // presigned URL issued, upload not confirmed yet
  UPLOADED = 'UPLOADED',
  REJECTED = 'REJECTED', // failed the mime/magic-byte check on completion
}

@Entity('deposit_files')
export class DepositFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DepositRequest, (request) => request.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: DepositRequest;

  @Column()
  requestId: string;

  @Column()
  originalName: string;

  @Column()
  declaredMimeType: string;

  // `type` is explicit on every nullable column: TypeScript reflects a
  // `string | null` property as design:type Object, which TypeORM cannot
  // map to a postgres type - it throws DataTypeNotSupportedError at
  // DataSource.initialize(), i.e. before the first migration runs.
  @Column({ type: 'varchar', nullable: true })
  detectedMimeType: string | null;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  storageKey: string;

  @Column({ type: 'enum', enum: DepositFileStatus, default: DepositFileStatus.PENDING })
  status: DepositFileStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;
}
