import { GoneException, HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { PublicService } from './public.service';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositRequestStatus } from '../requests/request-status.enum';
import { RequestStatusService } from '../requests/request-status.service';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage.service';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { hashPin } from '../common/security/pin.util';

describe('PublicService.unlock', () => {
  const PEPPER = 'test-pepper';
  const MAX_ATTEMPTS = 3;
  let request: DepositRequest;
  let repo: Partial<Record<keyof Repository<DepositRequest>, jest.Mock>>;
  let filesService: Partial<Record<keyof FilesService, jest.Mock>>;
  let auditService: Partial<Record<keyof AuditService, jest.Mock>>;
  let service: PublicService;

  beforeEach(async () => {
    request = {
      id: 'req-1',
      token: 'tok-1',
      pinHash: await hashPin('1234', PEPPER),
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      status: DepositRequestStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      requiredCount: 4,
      title: 'Dossier Test',
    } as DepositRequest;

    repo = {
      findOne: jest.fn(async () => request),
      findOneOrFail: jest.fn(async () => request),
      update: jest.fn(async (_id, patch) => Object.assign(request, patch)),
    };
    filesService = {
      countUploaded: jest.fn(async () => 0),
      listUploaded: jest.fn(async () => []),
    };
    auditService = { record: jest.fn(async () => undefined) };

    const configService = {
      getOrThrow: (key: string) => (key === 'PIN_PEPPER' ? PEPPER : 'value'),
      get: (key: string, fallback?: unknown) => {
        if (key === 'PIN_MAX_ATTEMPTS') return MAX_ATTEMPTS;
        if (key === 'PIN_LOCKOUT_MINUTES') return 15;
        return fallback;
      },
    } as unknown as ConfigService;

    const jwtService = { sign: jest.fn(() => 'signed.jwt.token') } as unknown as JwtService;

    service = new PublicService(
      repo as unknown as Repository<DepositRequest>,
      new RequestStatusService(),
      filesService as unknown as FilesService,
      {} as StorageService,
      auditService as unknown as AuditService,
      new MetricsService(),
      jwtService,
      configService,
    );
  });

  it('unlocks with the correct PIN and resets the attempt counter', async () => {
    const result = await service.unlock('tok-1', '1234', {});
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.request.title).toBe('Dossier Test');
    expect(request.pinFailedAttempts).toBe(0);
    expect(request.pinLockedUntil).toBeNull();
  });

  it('rejects an incorrect PIN and increments the failure counter', async () => {
    await expect(service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.pinFailedAttempts).toBe(1);
    expect(request.pinLockedUntil).toBeNull();
  });

  it('locks the link after reaching PIN_MAX_ATTEMPTS failures', async () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      await expect(service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(request.pinLockedUntil).toBeNull();

    await expect(service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.pinLockedUntil).not.toBeNull();

    // Further attempts are refused with 423, even with the *correct* PIN,
    // until the lockout window elapses.
    await expect(service.unlock('tok-1', '1234', {})).rejects.toBeInstanceOf(HttpException);
  });

  it('refuses to unlock an expired link, regardless of the PIN', async () => {
    request.expiresAt = new Date(Date.now() - 1000);
    await expect(service.unlock('tok-1', '1234', {})).rejects.toBeInstanceOf(GoneException);
  });
});
