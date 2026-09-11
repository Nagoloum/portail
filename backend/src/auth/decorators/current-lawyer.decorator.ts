import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LawyerJwtPayload } from '../jwt-payload.type';

export const CurrentLawyer = createParamDecorator((_: unknown, ctx: ExecutionContext): LawyerJwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
