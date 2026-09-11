import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditAction {
  LINK_ACCESSED = 'LINK_ACCESSED',
  PIN_SUCCESS = 'PIN_SUCCESS',
  PIN_FAILURE = 'PIN_FAILURE',
  PIN_LOCKED = 'PIN_LOCKED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_REJECTED = 'FILE_REJECTED',
}

/**
 * Append-only trail of who touched a public link and when. This is the
 * "journal d'audit des acces au lien public" bonus item: it lets the
 * lawyer (or us, in support) answer "who opened this link, from where,
 * and did they get the PIN wrong repeatedly" after the fact.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  requestId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  // Explicit types: a `string | null` property reflects as Object, which
  // TypeORM refuses to map (see deposit-file.entity.ts).
  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
