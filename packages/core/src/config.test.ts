import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  configSchema,
  parseConfig,
  type AppConfig,
  type LogLevel,
} from './config.js';

describe('config', () => {
  it('defines the supported log levels', () => {
    expectTypeOf<LogLevel>().toEqualTypeOf<
      'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'SILENT'
    >();
  });

  it('defines the application config shape', () => {
    expectTypeOf<AppConfig>().toEqualTypeOf<{
      readonly discordToken: string;
      readonly discordGuildId: string;
      readonly logLevel: LogLevel;
    }>();
  });

  it('keeps the schema output in sync with the config type', () => {
    expectTypeOf<
      Readonly<z.infer<typeof configSchema>>
    >().toEqualTypeOf<AppConfig>();
  });

  it('defaults the log level to INFO', () => {
    const config = configSchema.parse({
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
    });

    expect(config).toEqual({
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
      logLevel: 'INFO',
    });
  });

  it('rejects missing or empty credentials', () => {
    expect(() =>
      configSchema.parse({ discordGuildId: 'test-guild' }),
    ).toThrow();
    expect(() => configSchema.parse({ discordToken: 'test-token' })).toThrow();
    expect(() =>
      configSchema.parse({ discordToken: '', discordGuildId: 'test-guild' }),
    ).toThrow();
  });

  it('rejects an unsupported log level', () => {
    expect(() =>
      configSchema.parse({
        discordToken: 'test-token',
        discordGuildId: 'test-guild',
        logLevel: 'VERBOSE',
      }),
    ).toThrow();
  });
});

describe('parseConfig', () => {
  it('maps environment variables onto the application config', () => {
    expect(
      parseConfig({
        DISCORD_TOKEN: 'test-token',
        DISCORD_GUILD_ID: 'test-guild',
        LOG_LEVEL: 'DEBUG',
      }),
    ).toEqual({
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
      logLevel: 'DEBUG',
    });
  });

  it('defaults the log level when LOG_LEVEL is not set', () => {
    expect(
      parseConfig({
        DISCORD_TOKEN: 'test-token',
        DISCORD_GUILD_ID: 'test-guild',
      }),
    ).toEqual({
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
      logLevel: 'INFO',
    });
  });

  it('rejects missing credentials', () => {
    expect(() => parseConfig({})).toThrow();
  });
});
