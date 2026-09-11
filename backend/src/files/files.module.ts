import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositFile } from './deposit-file.entity';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([DepositFile])],
  providers: [FilesService, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
