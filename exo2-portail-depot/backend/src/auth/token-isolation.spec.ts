import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LawyerJwtStrategy } from './strategies/lawyer-jwt.strategy';
import { PublicJwtStrategy } from './strategies/public-jwt.strategy';
import { PublicAuthGuard } from './guards/public-auth.guard';
import { LawyerJwtPayload, PublicJwtPayload } from './jwt-payload.type';

/**
 * The README makes two claims about the two JWT families, and they are the
 * load-bearing ones for this app's security:
 *
 *   1. both are signed with the same secret but carry a `type` claim, so a
 *      public deposit session can never be replayed on a lawyer route (nor
 *      the other way round);
 *   2. a public session is scoped to one link, so a token minted for one
 *      deposit cannot be used on another deposit's routes.
 *
 * Nothing exercised either of them: a signature-valid token is a *valid*
 * token, so if the `type` check or the token/URL comparison were ever
 * dropped, every existing test would still pass. These are those tests.
 */

const config = { getOrThrow: () => 'test-secret' } as unknown as ConfigService;

function contextWithParams(params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ params }) }),
  } as unknown as ExecutionContext;
}

describe('JWT type isolation between the lawyer and public surfaces', () => {
  const lawyerToken: LawyerJwtPayload = { sub: 'lawyer-1', email: 'a@b.dev', type: 'lawyer' };
  const publicToken: PublicJwtPayload = { sub: 'req-1', token: 'tok-1', type: 'public' };

  it('accepts a lawyer token on the lawyer strategy', () => {
    expect(new LawyerJwtStrategy(config).validate(lawyerToken)).toEqual(lawyerToken);
  });

  it('accepts a public token on the public strategy', () => {
    expect(new PublicJwtStrategy(config).validate(publicToken)).toEqual(publicToken);
  });

  it('refuses a public session replayed on a lawyer route', () => {
    const strategy = new LawyerJwtStrategy(config);
    expect(() => strategy.validate(publicToken as unknown as LawyerJwtPayload)).toThrow(UnauthorizedException);
  });

  it('refuses a lawyer token replayed on a public route', () => {
    const strategy = new PublicJwtStrategy(config);
    expect(() => strategy.validate(lawyerToken as unknown as PublicJwtPayload)).toThrow(UnauthorizedException);
  });

  it('refuses a token with no type claim at all', () => {
    const untyped = { sub: 'x' } as unknown as LawyerJwtPayload;
    expect(() => new LawyerJwtStrategy(config).validate(untyped)).toThrow(UnauthorizedException);
    expect(() => new PublicJwtStrategy(config).validate(untyped as unknown as PublicJwtPayload)).toThrow(
      UnauthorizedException,
    );
  });
});

describe('PublicAuthGuard link scoping', () => {
  const guard = new PublicAuthGuard();
  const session: PublicJwtPayload = { sub: 'req-1', token: 'tok-1', type: 'public' };

  it('lets a session through on the link it was minted for', () => {
    expect(guard.handleRequest(null, session, null, contextWithParams({ token: 'tok-1' }))).toEqual(session);
  });

  it('refuses a session minted for another link', () => {
    expect(() => guard.handleRequest(null, session, null, contextWithParams({ token: 'tok-2' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a request with no authenticated session', () => {
    expect(() =>
      guard.handleRequest(null, undefined as unknown as PublicJwtPayload, null, contextWithParams({ token: 'tok-1' })),
    ).toThrow(UnauthorizedException);
  });

  it('propagates the underlying passport error when there is one', () => {
    const boom = new Error('jwt expired');
    expect(() => guard.handleRequest(boom, session, null, contextWithParams({ token: 'tok-1' }))).toThrow(boom);
  });
});
