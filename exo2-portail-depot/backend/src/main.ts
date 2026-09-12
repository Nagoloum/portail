import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * In production the SPA is served from the same origin as the API (nginx
 * proxies /auth, /requests and /public to this process), so CORS is not
 * needed at all there. It only exists for `vite dev` on another port.
 *
 * The previous `{ cors: true }` meant `Access-Control-Allow-Origin: *`:
 * any page on the internet could call this API from a visitor's browser.
 */
function allowedOrigins(config: ConfigService): string[] {
  const configured = config.getOrThrow<string>('FRONTEND_PUBLIC_BASE_URL').replace(/\/$/, '');
  const devOrigins =
    config.get<string>('NODE_ENV') === 'production'
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  return [...new Set([configured, ...devOrigins])];
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  const config = app.get(ConfigService);

  // Behind nginx: needed so req.ip / the throttler see the real client IP
  // from X-Forwarded-For instead of the proxy's.
  app.set('trust proxy', 1);

  // This process only ever answers JSON, so the HTML-oriented policies are
  // off and the ones that matter for an API stay on: nosniff, no referrer
  // leak, frame denial, and HSTS (the deployment is HTTPS-only, see the
  // edge nginx).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 15_552_000, includeSubDomains: true },
    }),
  );

  app.enableCors({
    origin: allowedOrigins(config),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend listening on :${port}`, 'Bootstrap');
}

bootstrap();
