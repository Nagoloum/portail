import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PublicJwtPayload } from '../jwt-payload.type';

/**
 * Guards the /public/:token/* routes that run after unlock. Beyond the
 * usual JWT validity check, it re-checks that the token embedded in the
 * bearer JWT matches the :token in the URL, so a session minted for one
 * request cannot be replayed against another request's routes.
 */
@Injectable()
export class PublicAuthGuard extends AuthGuard('jwt-public') {
  handleRequest<TUser = PublicJwtPayload>(err: unknown, user: PublicJwtPayload, _info: unknown, context: ExecutionContext): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Session invalide ou expiree');
    }
    const request = context.switchToHttp().getRequest();
    if (request.params?.token && request.params.token !== user.token) {
      throw new UnauthorizedException('Session invalide pour ce lien');
    }
    return user as unknown as TUser;
  }
}
