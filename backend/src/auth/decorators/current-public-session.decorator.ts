import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicJwtPayload } from '../jwt-payload.type';

export const CurrentPublicSession = createParamDecorator((_: unknown, ctx: ExecutionContext): PublicJwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
