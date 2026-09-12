import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RequestsModule } from '../requests/requests.module';
import { FilesModule } from '../files/files.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [
    RequestsModule,
    FilesModule,
    AuditModule,
    AuthModule,
    // Upload limits belong here rather than in a module-scope
    // `process.env` read inside the controller: this way MAX_FILE_SIZE_MB
    // goes through the same Joi-validated ConfigService as every other
    // setting, and a typo in .env fails at boot instead of silently
    // becoming NaN and disabling the limit.
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(), // never touches the app's local disk
        limits: { fileSize: config.get<number>('MAX_FILE_SIZE_MB', 20) * 1024 * 1024, files: 1 },
      }),
    }),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
