import { describe, expect, expectTypeOf, it } from 'vitest';
import type { AppConfig, LogLevel } from './config.js';

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

    const config: AppConfig = {
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
      logLevel: 'INFO',
    };

    expect(config).toEqual({
      discordToken: 'test-token',
      discordGuildId: 'test-guild',
      logLevel: 'INFO',
    });
  });
});
