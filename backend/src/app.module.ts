import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { Lawyer } from './lawyers/lawyer.entity';
import { DepositRequest } from './requests/deposit-request.entity';
import { DepositFile } from './files/deposit-file.entity';
import { AuditLog } from './audit/audit-log.entity';
import { AuthModule } from './auth/auth.module';
import { LawyersModule } from './lawyers/lawyers.module';
import { RequestsModule } from './requests/requests.module';
import { PublicModule } from './public/public.module';
import { FilesModule } from './files/files.module';
import { AuditModule } from './audit/audit.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        entities: [Lawyer, DepositRequest, DepositFile, AuditLog],
        // Schema only ever changes through the migrations run by
        // install.sh / the entrypoint - never via app-boot synchronize.
        synchronize: false,
        autoLoadEntities: false,
      }),
    }),
    // Coarse, global rate limit as a first line of defense in front of the
    // dedicated PIN lockout (see PublicService) - see README "Rate limiting".
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    MetricsModule,
    AuthModule,
    LawyersModule,
    RequestsModule,
    PublicModule,
    FilesModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
