import { z } from 'zod';

const logLevelSchema = z.enum([
  'FATAL',
  'ERROR',
  'WARN',
  'INFO',
  'DEBUG',
  'TRACE',
  'SILENT',
]);

export type LogLevel = z.infer<typeof logLevelSchema>;

export interface AppConfig {
  readonly discordToken: string;
  readonly discordGuildId: string;
  readonly logLevel: LogLevel;
}

export const configSchema = z.object({
  discordToken: z.string().min(1),
  discordGuildId: z.string().min(1),
  logLevel: logLevelSchema.default('INFO'),
}) satisfies z.ZodType<AppConfig>;

/**
 * Validate environment variables and return the application config.
 *
 * @param env - Environment to read from, defaults to process.env
 * @returns validated application config
 */
export const parseConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig =>
  configSchema.parse({
    discordToken: env.DISCORD_TOKEN,
    discordGuildId: env.DISCORD_GUILD_ID,
    logLevel: env.LOG_LEVEL,
  });
