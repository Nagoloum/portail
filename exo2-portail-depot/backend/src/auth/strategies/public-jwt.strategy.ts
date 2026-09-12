import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PublicJwtPayload } from '../jwt-payload.type';

@Injectable()
export class PublicJwtStrategy extends PassportStrategy(Strategy, 'jwt-public') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: PublicJwtPayload): PublicJwtPayload {
    if (payload.type !== 'public') {
      throw new UnauthorizedException('Jeton invalide pour cette ressource');
    }
    return payload;
  }
}
