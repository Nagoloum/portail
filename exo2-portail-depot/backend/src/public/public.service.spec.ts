import { ConflictException, GoneException, HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PublicService } from './public.service';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositRequestStatus } from '../requests/request-status.enum';
import { RequestStatusService } from '../requests/request-status.service';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage.service';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { hashPin } from '../common/security/pin.util';

const PEPPER = 'test-pepper';
const MAX_ATTEMPTS = 3;

interface Harness {
  service: PublicService;
  request: DepositRequest;
  repo: Partial<Record<keyof Repository<DepositRequest>, jest.Mock>>;
  filesService: Partial<Record<keyof FilesService, jest.Mock>>;
  storage: { putObject: jest.Mock; deleteObject: jest.Mock };
  manager: { findOne: jest.Mock; update: jest.Mock };
}

async function buildHarness(overrides: Partial<DepositRequest> = {}): Promise<Harness> {
  const request = {
    id: 'req-1',
    token: 'tok-1',
    pinHash: await hashPin('1234', PEPPER),
    pinFailedAttempts: 0,
    pinLockedUntil: null,
    status: DepositRequestStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    requiredCount: 4,
    title: 'Dossier Test',
    ...overrides,
  } as DepositRequest;

  const repo = {
    findOne: jest.fn(async () => request),
    update: jest.fn(async (_id: string, patch: Partial<DepositRequest>) => Object.assign(request, patch)),
  };
  const filesService = {
    countUploaded: jest.fn(async () => 0),
    listUploaded: jest.fn(async () => []),
    recordUpload: jest.fn(async () => ({ id: 'file-1' })),
  };
  const storage = { putObject: jest.fn(async () => undefined), deleteObject: jest.fn(async () => undefined) };
  const auditService = { record: jest.fn(async () => undefined) };

  // Stands in for the row-locking transaction: hands the callback a manager
  // whose findOne returns the same request object the repo does.
  const manager = {
    findOne: jest.fn(async () => request),
    update: jest.fn(async (_entity: unknown, _id: string, patch: Partial<DepositRequest>) =>
      Object.assign(request, patch),
    ),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(manager as unknown as EntityManager)),
  } as unknown as DataSource;

  const configService = {
    getOrThrow: (key: string) => (key === 'PIN_PEPPER' ? PEPPER : 'value'),
    get: (key: string, fallback?: unknown) => {
      if (key === 'PIN_MAX_ATTEMPTS') return MAX_ATTEMPTS;
      if (key === 'PIN_LOCKOUT_MINUTES') return 15;
      return fallback;
    },
  } as unknown as ConfigService;

  const jwtService = { sign: jest.fn(() => 'signed.jwt.token') } as unknown as JwtService;

  const service = new PublicService(
    repo as unknown as Repository<DepositRequest>,
    dataSource,
    new RequestStatusService(),
    filesService as unknown as FilesService,
    storage as unknown as StorageService,
    auditService as unknown as AuditService,
    new MetricsService(),
    jwtService,
    configService,
  );

  return { service, request, repo, filesService, storage, manager };
}

describe('PublicService.unlock', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await buildHarness();
  });

  it('unlocks with the correct PIN and resets the attempt counter', async () => {
    const result = await h.service.unlock('tok-1', '1234', {});
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.request.title).toBe('Dossier Test');
    expect(h.request.pinFailedAttempts).toBe(0);
    expect(h.request.pinLockedUntil).toBeNull();
  });

  it('rejects an incorrect PIN and increments the failure counter', async () => {
    await expect(h.service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(h.request.pinFailedAttempts).toBe(1);
    expect(h.request.pinLockedUntil).toBeNull();
  });

  it('locks the link after reaching PIN_MAX_ATTEMPTS failures', async () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      await expect(h.service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(h.request.pinLockedUntil).toBeNull();

    await expect(h.service.unlock('tok-1', '0000', {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(h.request.pinLockedUntil).not.toBeNull();

    // Further attempts are refused with 423, even with the *correct* PIN,
    // until the lockout window elapses.
    await expect(h.service.unlock('tok-1', '1234', {})).rejects.toBeInstanceOf(HttpException);
  });

  it('refuses to unlock an expired link, regardless of the PIN', async () => {
    h.request.expiresAt = new Date(Date.now() - 1000);
    await expect(h.service.unlock('tok-1', '1234', {})).rejects.toBeInstanceOf(GoneException);
  });
});

describe('PublicService.uploadFile', () => {
  const pdf = {
    originalname: 'piece.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.7 hello'),
  } as Express.Multer.File;

  it('stores the file and flips the request to COMPLETE on the last piece', async () => {
    const h = await buildHarness({ requiredCount: 1 });

    await h.service.uploadFile('req-1', pdf, {});

    expect(h.storage.putObject).toHaveBeenCalledTimes(1);
    expect(h.filesService.recordUpload).toHaveBeenCalledTimes(1);
    expect(h.manager.update).toHaveBeenCalledWith(DepositRequest, 'req-1', {
      status: DepositRequestStatus.COMPLETE,
    });
  });

  /**
   * The regression this guards: the count and the insert used to run
   * outside a transaction, so two uploads racing on a `requiredCount: 1`
   * request both read "0 uploaded", both passed the check, and both were
   * stored - one piece too many. Here the count changes between the
   * pre-check and the locked re-check, exactly as it would for the loser
   * of the race.
   */
  it('refuses a piece whose slot was taken between the pre-check and the commit', async () => {
    const h = await buildHarness({ requiredCount: 1 });
    (h.filesService.countUploaded as jest.Mock)
      .mockResolvedValueOnce(0) // pre-check: still room
      .mockResolvedValueOnce(1); // inside the lock: the other upload won

    await expect(h.service.uploadFile('req-1', pdf, {})).rejects.toBeInstanceOf(ConflictException);

    expect(h.filesService.recordUpload).not.toHaveBeenCalled();
  });

  it('deletes the stored object when the commit is refused, leaving no orphan in the bucket', async () => {
    const h = await buildHarness({ requiredCount: 1 });
    (h.filesService.countUploaded as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await expect(h.service.uploadFile('req-1', pdf, {})).rejects.toBeInstanceOf(ConflictException);

    const storedKey = h.storage.putObject.mock.calls[0][0];
    expect(h.storage.deleteObject).toHaveBeenCalledWith(storedKey);
  });

  it('rejects an executable renamed .pdf before anything reaches the bucket', async () => {
    const h = await buildHarness();
    const fake = { ...pdf, buffer: Buffer.from('MZ\x90\x00 this is a PE binary') } as Express.Multer.File;

    await expect(h.service.uploadFile('req-1', fake, {})).rejects.toThrow(/ne correspond pas/);
    expect(h.storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses a deposit on an expired link', async () => {
    const h = await buildHarness({ expiresAt: new Date(Date.now() - 1000) });
    await expect(h.service.uploadFile('req-1', pdf, {})).rejects.toBeInstanceOf(ConflictException);
    expect(h.storage.putObject).not.toHaveBeenCalled();
  });
});
