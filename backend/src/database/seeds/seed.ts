import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Lawyer } from '../../lawyers/lawyer.entity';
import { DepositRequest } from '../../requests/deposit-request.entity';
import { DepositRequestStatus } from '../../requests/request-status.enum';
import { hashPassword } from '../../common/security/password.util';
import { hashPin } from '../../common/security/pin.util';

/**
 * Idempotent: safe to run on every deploy (install.sh calls it after each
 * migration). Creates the demo lawyer account and one seeded request so
 * a fresh install always has something to look at, per the "identifiants
 * de demo ... et au moins une demande seedee" requirement.
 */
async function seed() {
  const dataSource = await AppDataSource.initialize();

  const lawyerRepo = dataSource.getRepository(Lawyer);
  const requestRepo = dataSource.getRepository(DepositRequest);

  const demoEmail = process.env.SEED_LAWYER_EMAIL ?? 'avocat@demo.dev';
  const demoPassword = process.env.SEED_LAWYER_PASSWORD ?? 'Demo1234!';
  const pepper = process.env.PIN_PEPPER ?? 'dev-pepper-change-me';

  let lawyer = await lawyerRepo.findOne({ where: { email: demoEmail } });
  if (!lawyer) {
    lawyer = await lawyerRepo.save(
      lawyerRepo.create({
        email: demoEmail,
        passwordHash: await hashPassword(demoPassword),
        name: 'Maitre Demo',
      }),
    );
    console.log(`[seed] created demo lawyer ${demoEmail} / ${demoPassword}`);
  } else {
    console.log(`[seed] demo lawyer ${demoEmail} already exists`);
  }

  const existing = await requestRepo.findOne({ where: { title: 'Dossier Martin, pieces 2026' } });
  if (!existing) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 4);

    // Fixed token for the seeded request only, so install.sh can print a
    // clickable client link at the end of a fresh install. Every request
    // created through the API still gets a random token from
    // generateRequestToken() - see requests.service.ts.
    const seededToken = process.env.SEED_REQUEST_TOKEN || '8f3a2c1b4d5e6f70';

    await requestRepo.save(
      requestRepo.create({
        lawyerId: lawyer.id,
        title: 'Dossier Martin, pieces 2026',
        token: seededToken,
        pinHash: await hashPin('1234', pepper),
        requiredCount: 4,
        expiresAt,
        status: DepositRequestStatus.PENDING,
      }),
    );
    console.log('[seed] created demo request "Dossier Martin, pieces 2026" (PIN: 1234)');
  } else {
    console.log('[seed] demo request already exists');
  }

  await dataSource.destroy();
}

seed()
  .then(() => {
    console.log('[seed] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  });
