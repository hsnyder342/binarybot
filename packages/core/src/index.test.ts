import { describe, expect, expectTypeOf, it } from 'vitest';
import * as core from './index.js';
import type {
  AppConfig,
  Health,
  Logger,
  LogLevel,
  Service,
  ServiceContext,
} from './index.js';

describe('core', () => {
  it('exports createLogger at runtime', () => {
    expect(core.createLogger).toBeTypeOf('function');
  });

  it('re-exports the logger contract', () => {
    expectTypeOf<ReturnType<typeof core.createLogger>>().toEqualTypeOf<Logger>();
  });

  it('re-exports the config, health, and service contracts', () => {
    expectTypeOf<AppConfig>().toHaveProperty('discordToken');
    expectTypeOf<LogLevel>().toEqualTypeOf<
      'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'SILENT'
    >();
    expectTypeOf<Health>().toHaveProperty('isReady');
    expectTypeOf<ServiceContext>().toHaveProperty('client');
    expectTypeOf<Service>().toHaveProperty('start');
  });
});
