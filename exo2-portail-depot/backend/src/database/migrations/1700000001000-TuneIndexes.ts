import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the two single-column indexes from InitSchema with composite
 * ones that match the queries actually issued.
 *
 * - `deposit_requests`: the lawyer list is
 *   `WHERE lawyerId = $1 ORDER BY createdAt DESC, id DESC LIMIT/OFFSET`.
 *   The old index on (lawyerId) alone let postgres find the rows but not
 *   read them in order, so every page cost a sort of the lawyer's whole
 *   history. Adding the sort keys makes the pagination an index scan.
 * - `deposit_files`: every count and list filters on
 *   `(requestId, status = 'UPLOADED')`. Indexing both columns lets the
 *   count be answered without touching rejected/pending rows.
 *
 * Both old indexes are dropped rather than kept: (lawyerId) and
 * (requestId) are leftmost prefixes of the new ones, so they are redundant
 * for reads and pure write overhead.
 */
export class TuneIndexes1700000001000 implements MigrationInterface {
  name = 'TuneIndexes1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deposit_requests_lawyerId"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_deposit_requests_lawyer_created"
        ON "deposit_requests" ("lawyerId", "createdAt" DESC, "id" DESC)
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deposit_files_requestId"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_deposit_files_request_status"
        ON "deposit_files" ("requestId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deposit_files_request_status"`);
    await queryRunner.query(`CREATE INDEX "IDX_deposit_files_requestId" ON "deposit_files" ("requestId")`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deposit_requests_lawyer_created"`);
    await queryRunner.query(`CREATE INDEX "IDX_deposit_requests_lawyerId" ON "deposit_requests" ("lawyerId")`);
  }
}
