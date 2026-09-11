import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LawyerAuthGuard extends AuthGuard('jwt-lawyer') {}
