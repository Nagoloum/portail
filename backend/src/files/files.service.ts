import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositFile, DepositFileStatus } from './deposit-file.entity';

export interface RecordUploadInput {
  requestId: string;
  originalName: string;
  declaredMimeType: string;
  detectedMimeType: string | null;
  size: number;
  storageKey: string;
}

@Injectable()
export class FilesService {
  constructor(@InjectRepository(DepositFile) private readonly repo: Repository<DepositFile>) {}

  async recordUpload(input: RecordUploadInput): Promise<DepositFile> {
    const entity = this.repo.create({
      ...input,
      status: DepositFileStatus.UPLOADED,
      uploadedAt: new Date(),
    });
    return this.repo.save(entity);
  }

  countUploaded(requestId: string): Promise<number> {
    return this.repo.count({ where: { requestId, status: DepositFileStatus.UPLOADED } });
  }

  listUploaded(requestId: string): Promise<DepositFile[]> {
    return this.repo.find({
      where: { requestId, status: DepositFileStatus.UPLOADED },
      order: { createdAt: 'ASC' },
    });
  }
}
