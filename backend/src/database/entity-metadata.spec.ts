import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Lawyer } from '../lawyers/lawyer.entity';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositFile } from '../files/deposit-file.entity';
import { AuditLog } from '../audit/audit-log.entity';

/**
 * Regression guard, added after a real failure: `@Column({ nullable: true })
 * detectedMimeType: string | null` compiles, passes every unit test, and
 * still brings the container down on boot - TypeScript reflects a union
 * type as design:type Object, and TypeORM rejects it with
 * DataTypeNotSupportedError while building metadata, before the first
 * migration runs.
 *
 * Every other spec in this repo deliberately tests pure logic with mocked
 * repositories, so nothing exercised the mapping layer. This builds the
 * entity metadata - the exact step that used to throw - without needing a
 * live database.
 */
describe('entity metadata', () => {
  it('maps every column of every entity to a postgres type', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      entities: [Lawyer, DepositRequest, DepositFile, AuditLog],
      synchronize: false,
    });

    // buildMetadatas() is where EntityMetadataValidator runs. It is
    // protected in TypeORM's typings but does not touch the network, which
    // is exactly what we want here.
    await (dataSource as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();

    const names = dataSource.entityMetadatas.map((m) => m.tableName).sort();
    expect(names).toEqual(['audit_logs', 'deposit_files', 'deposit_requests', 'lawyers']);

    // Belt and braces: buildMetadatas() already throws on an unmapped
    // column, but Object is the specific shape a `T | null` property
    // reflects to, so name it explicitly.
    for (const metadata of dataSource.entityMetadatas) {
      for (const column of metadata.columns) {
        expect({ column: `${metadata.tableName}.${column.propertyName}`, type: column.type }).not.toEqual({
          column: `${metadata.tableName}.${column.propertyName}`,
          type: Object,
        });
      }
    }
  });
});
