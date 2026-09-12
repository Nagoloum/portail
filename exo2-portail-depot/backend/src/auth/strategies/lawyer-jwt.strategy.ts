import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { LawyerJwtPayload } from '../jwt-payload.type';

@Injectable()
export class LawyerJwtStrategy extends PassportStrategy(Strategy, 'jwt-lawyer') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: LawyerJwtPayload): LawyerJwtPayload {
    if (payload.type !== 'lawyer') {
      throw new UnauthorizedException('Jeton invalide pour cette ressource');
    }
    return payload;
  }
}
