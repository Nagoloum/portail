import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lawyer } from './lawyer.entity';
import { LawyersService } from './lawyers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lawyer])],
  providers: [LawyersService],
  exports: [LawyersService],
})
export class LawyersModule {}
