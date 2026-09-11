import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositRequest } from './deposit-request.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestStatusService } from './request-status.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([DepositRequest]), AuthModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestStatusService],
  exports: [RequestsService, RequestStatusService, TypeOrmModule],
})
export class RequestsModule {}
