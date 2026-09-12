import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { FilesModule } from '../files/files.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [RequestsModule, FilesModule, AuditModule, AuthModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
