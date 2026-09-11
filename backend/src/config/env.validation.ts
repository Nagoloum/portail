import * as Joi from 'joi';

/**
 * Fail fast on missing/invalid configuration rather than crashing later
 * on a first request. Keeps prod misconfiguration visible at boot.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  PUBLIC_JWT_EXPIRES_IN: Joi.string().default('45m'),
  PIN_PEPPER: Joi.string().min(8).required(),

  FRONTEND_PUBLIC_BASE_URL: Joi.string().uri().required(),

  S3_ENDPOINT: Joi.string().uri().required(),
  S3_REGION: Joi.string().default('us-east-1'),
  S3_BUCKET: Joi.string().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),

  MAX_FILE_SIZE_MB: Joi.number().default(20),
  LINK_DEFAULT_TTL_DAYS: Joi.number().default(7),

  PIN_MAX_ATTEMPTS: Joi.number().default(5),
  PIN_LOCKOUT_MINUTES: Joi.number().default(15),
});
