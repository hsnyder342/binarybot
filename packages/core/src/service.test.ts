import { describe, expect, expectTypeOf, it } from 'vitest';
import type { AppConfig } from './config.js';
import type { Health } from './health.js';
import type { Logger } from './logger.js';
import { createLogger } from './logger.js';
import type { Service, ServiceContext } from './service.js';

interface TestClient {
  readonly id: string;
}

const config: AppConfig = {
  discordToken: 'test-token',
  discordGuildId: 'test-guild',
  logLevel: 'SILENT',
};

const health: Health = {
  isReady: () => false,
  markReady: () => undefined,
  markNotReady: () => undefined,
};

const context: ServiceContext<TestClient> = {
  client: { id: 'client-1' },
  config,
  logger: createLogger(config),
  health,
};

class TestService implements Service<TestClient> {
  readonly name = 'test-service';
  readonly calls: string[] = [];

  start(context: ServiceContext<TestClient>): void {
    this.calls.push(`start:${context.client.id}`);
  }

  stop(): void {
    this.calls.push('stop');
  }
}

describe('service', () => {
  it('defines the service contract', () => {
    expectTypeOf<Service<TestClient>>().toEqualTypeOf<{
      readonly name: string;
      start(context: ServiceContext<TestClient>): Promise<void> | void;
      stop(): Promise<void> | void;
    }>();
  });

  it('carries the client, config, logger, and health in the context', () => {
    expectTypeOf(context.client).toEqualTypeOf<TestClient>();
    expectTypeOf(context.config).toEqualTypeOf<AppConfig>();
    expectTypeOf(context.logger).toEqualTypeOf<Logger>();
    expectTypeOf(context.health).toEqualTypeOf<Health>();
  });

  it('defaults the client type to unknown', () => {
    expectTypeOf<ServiceContext>().toEqualTypeOf<ServiceContext<unknown>>();
    expectTypeOf<Service>().toEqualTypeOf<Service<unknown>>();
  });

  it('supports lifecycle calls', async () => {
    const service = new TestService();

    await service.start(context);
    await service.stop();

    expect(service.calls).toEqual(['start:client-1', 'stop']);
  });
});
