import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LawyersModule } from '../lawyers/lawyers.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LawyerJwtStrategy } from './strategies/lawyer-jwt.strategy';
import { PublicJwtStrategy } from './strategies/public-jwt.strategy';

@Module({
  imports: [
    LawyersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LawyerJwtStrategy, PublicJwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
