import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DepositFile, DepositFileStatus } from './deposit-file.entity';

export interface RecordUploadInput {
  requestId: string;
  originalName: string;
  declaredMimeType: string;
  detectedMimeType: string | null;
  size: number;
  storageKey: string;
}

/**
 * Every read/write takes an optional `EntityManager` so the upload flow can
 * run its count-check-insert inside a single transaction (see
 * PublicService.uploadFile). Without it, the count and the insert would run
 * on different connections and the "requiredCount" cap could be crossed by
 * two concurrent uploads.
 */
@Injectable()
export class FilesService {
  constructor(@InjectRepository(DepositFile) private readonly repo: Repository<DepositFile>) {}

  private scoped(manager?: EntityManager): Repository<DepositFile> {
    return manager ? manager.getRepository(DepositFile) : this.repo;
  }

  async recordUpload(input: RecordUploadInput, manager?: EntityManager): Promise<DepositFile> {
    const repo = this.scoped(manager);
    return repo.save(
      repo.create({
        ...input,
        status: DepositFileStatus.UPLOADED,
        uploadedAt: new Date(),
      }),
    );
  }

  countUploaded(requestId: string, manager?: EntityManager): Promise<number> {
    return this.scoped(manager).count({ where: { requestId, status: DepositFileStatus.UPLOADED } });
  }

  listUploaded(requestId: string, manager?: EntityManager): Promise<DepositFile[]> {
    return this.scoped(manager).find({
      where: { requestId, status: DepositFileStatus.UPLOADED },
      order: { createdAt: 'ASC' },
    });
  }
}
