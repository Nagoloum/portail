import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "lawyers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "name" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE TYPE "deposit_requests_status_enum" AS ENUM ('PENDING', 'COMPLETE')`);
    await queryRunner.query(`
      CREATE TABLE "deposit_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lawyerId" uuid NOT NULL REFERENCES "lawyers"("id") ON DELETE CASCADE,
        "title" varchar NOT NULL,
        "token" varchar NOT NULL,
        "pinHash" varchar NOT NULL,
        "requiredCount" int NOT NULL DEFAULT 1,
        "expiresAt" timestamptz NOT NULL,
        "status" "deposit_requests_status_enum" NOT NULL DEFAULT 'PENDING',
        "pinFailedAttempts" int NOT NULL DEFAULT 0,
        "pinLockedUntil" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_deposit_requests_token" ON "deposit_requests" ("token")`);
    await queryRunner.query(`CREATE INDEX "IDX_deposit_requests_lawyerId" ON "deposit_requests" ("lawyerId")`);

    await queryRunner.query(`CREATE TYPE "deposit_files_status_enum" AS ENUM ('PENDING', 'UPLOADED', 'REJECTED')`);
    await queryRunner.query(`
      CREATE TABLE "deposit_files" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestId" uuid NOT NULL REFERENCES "deposit_requests"("id") ON DELETE CASCADE,
        "originalName" varchar NOT NULL,
        "declaredMimeType" varchar NOT NULL,
        "detectedMimeType" varchar,
        "size" bigint NOT NULL,
        "storageKey" varchar NOT NULL,
        "status" "deposit_files_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "uploadedAt" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_deposit_files_requestId" ON "deposit_files" ("requestId")`);

    await queryRunner.query(`
      CREATE TYPE "audit_logs_action_enum" AS ENUM (
        'LINK_ACCESSED', 'PIN_SUCCESS', 'PIN_FAILURE', 'PIN_LOCKED', 'FILE_UPLOADED', 'FILE_REJECTED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestId" uuid NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "ip" varchar,
        "userAgent" varchar,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_requestId" ON "audit_logs" ("requestId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
    await queryRunner.query(`DROP TABLE "deposit_files"`);
    await queryRunner.query(`DROP TYPE "deposit_files_status_enum"`);
    await queryRunner.query(`DROP TABLE "deposit_requests"`);
    await queryRunner.query(`DROP TYPE "deposit_requests_status_enum"`);
    await queryRunner.query(`DROP TABLE "lawyers"`);
  }
}
