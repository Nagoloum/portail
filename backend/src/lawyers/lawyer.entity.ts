import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DepositRequest } from '../requests/deposit-request.entity';

@Entity('lawyers')
export class Lawyer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DepositRequest, (request) => request.lawyer)
  requests: DepositRequest[];
}
