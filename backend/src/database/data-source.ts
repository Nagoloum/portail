import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Lawyer } from '../lawyers/lawyer.entity';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositFile } from '../files/deposit-file.entity';
import { AuditLog } from '../audit/audit-log.entity';

config();

/**
 * Used only by the TypeORM CLI (migration:generate/run/revert) and by the
 * seed script. The running Nest app builds its own connection options in
 * app.module.ts via ConfigService; kept separate so the CLI does not need
 * to boot the whole Nest context.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'portail',
  password: process.env.DB_PASSWORD ?? 'portail',
  database: process.env.DB_NAME ?? 'portail',
  entities: [Lawyer, DepositRequest, DepositFile, AuditLog],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
