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

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

export type LogLevel = z.infer<typeof logLevelSchema>;

export type NodeEnv = z.infer<typeof nodeEnvSchema>;

export interface AppConfig {
  readonly discordToken: string;
  readonly discordGuildId: string;
  readonly logLevel: LogLevel;
  readonly nodeEnv: NodeEnv;
}

export const configSchema = z.object({
  discordToken: z.string().min(1),
  discordGuildId: z.string().min(1),
  logLevel: logLevelSchema.default('INFO'),
  nodeEnv: nodeEnvSchema.default('development'),
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
    nodeEnv: env.NODE_ENV,
  });
