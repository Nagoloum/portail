import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LawyersService } from '../lawyers/lawyers.service';
import { verifyPassword } from '../common/security/password.util';
import { LawyerJwtPayload } from './jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly lawyers: LawyersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; lawyer: { id: string; email: string; name: string } }> {
    const lawyer = await this.lawyers.findByEmail(email);
    // Same error whether the email is unknown or the password is wrong -
    // never leak which one it was.
    if (!lawyer || !(await verifyPassword(password, lawyer.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: LawyerJwtPayload = { sub: lawyer.id, email: lawyer.email, type: 'lawyer' };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN'),
    });

    return { accessToken, lawyer: { id: lawyer.id, email: lawyer.email, name: lawyer.name } };
  }
}
