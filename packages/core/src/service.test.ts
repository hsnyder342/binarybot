import { describe, expect, expectTypeOf, it } from 'vitest';
import type { AppConfig } from './config.js';
import { HealthRegistry, HealthState, type Health } from './health.js';
import type { Logger } from './logger.js';
import { createLogger } from './logger.js';
import {
  ServiceRegistry,
  type Service,
  type ServiceContext,
  type ServiceContextBase,
} from './service.js';

interface TestClient {
  readonly id: string;
}

const config: AppConfig = {
  discordToken: 'test-token',
  discordGuildId: 'test-guild',
  logLevel: 'SILENT',
  nodeEnv: 'test',
};

const logger = createLogger(config);

const context: ServiceContext<TestClient> = {
  client: { id: 'client-1' },
  config,
  logger,
  health: new HealthState(),
};

const contextBase: ServiceContextBase<TestClient> = {
  client: context.client,
  config,
  logger,
};

class TestService implements Service<TestClient> {
  readonly name: string;
  readonly calls: string[] = [];
  readonly contexts: ServiceContext<TestClient>[] = [];

  constructor(
    name = 'test-service',
    private readonly order?: string[],
  ) {
    this.name = name;
  }

  start(context: ServiceContext<TestClient>): void {
    this.calls.push(`start:${this.name}`);
    this.contexts.push(context);
    this.order?.push(`start:${this.name}`);
  }

  stop(): void {
    this.calls.push(`stop:${this.name}`);
    this.order?.push(`stop:${this.name}`);
  }
}

class ReadyService extends TestService {
  start(context: ServiceContext<TestClient>): void {
    super.start(context);
    context.health.markReady();
  }
}

class FailingService extends TestService {
  start(): void {
    throw new Error('boom');
  }
}

class FailingStopService extends TestService {
  stop(): void {
    super.stop();
    throw new Error('boom');
  }
}

const createRegistry = (): ServiceRegistry<TestClient> =>
  new ServiceRegistry<TestClient>(new HealthRegistry(), contextBase);

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

  it('defines the base context without health', () => {
    expectTypeOf<ServiceContextBase<TestClient>>().toEqualTypeOf<
      Omit<ServiceContext<TestClient>, 'health'>
    >();
  });

  it('defaults the client type to unknown', () => {
    expectTypeOf<ServiceContext>().toEqualTypeOf<ServiceContext<unknown>>();
    expectTypeOf<Service>().toEqualTypeOf<Service<unknown>>();
  });

  it('supports lifecycle calls', async () => {
    const service = new TestService();

    await service.start(context);
    await service.stop();

    expect(service.calls).toEqual(['start:test-service', 'stop:test-service']);
  });
});

describe('ServiceRegistry', () => {
  it('rejects duplicate service names', () => {
    const services = createRegistry();
    services.register(new TestService('heartbeat'));

    expect(() => services.register(new TestService('heartbeat'))).toThrow(
      'Service "heartbeat" is already registered',
    );
  });

  it('does not register a service when its health name is taken', () => {
    const health = new HealthRegistry();
    health.register('client');
    const services = new ServiceRegistry<TestClient>(health, contextBase);

    expect(() => services.register(new TestService('client'))).toThrow(
      'Health "client" is already registered',
    );
    expect(services.services.has('client')).toBe(false);
  });

  it('lists registered services in registration order', () => {
    const services = createRegistry();
    services.register(new TestService('first'));
    services.register(new TestService('second'));

    expect(services.names()).toEqual(['first', 'second']);
    expect(services.has('first')).toBe(true);
    expect(services.has('missing')).toBe(false);
    expect(services.isRunning('first')).toBe(false);
  });

  it('gives each service its own health handle', async () => {
    const health = new HealthRegistry();
    const services = new ServiceRegistry<TestClient>(health, contextBase);
    const first = new TestService('first');
    const second = new TestService('second');
    services.register(first);
    services.register(second);

    await services.startAll();

    expect(first.contexts[0].health).not.toBe(second.contexts[0].health);
  });

  it('does not mark services ready on start', async () => {
    const health = new HealthRegistry();
    const services = new ServiceRegistry<TestClient>(health, contextBase);
    services.register(new TestService('heartbeat'));

    await services.startAll();

    expect(health.report()).toEqual({
      ready: false,
      components: { heartbeat: false },
    });
  });

  it('reflects readiness reported by a service', async () => {
    const health = new HealthRegistry();
    const services = new ServiceRegistry<TestClient>(health, contextBase);
    services.register(new ReadyService('ready'));

    await services.startAll();

    expect(health.isReady()).toBe(true);
    expect(health.report()).toEqual({
      ready: true,
      components: { ready: true },
    });
  });

  it('starts a single service without touching the others', async () => {
    const services = createRegistry();
    const first = new TestService('first');
    const second = new TestService('second');
    services.register(first);
    services.register(second);

    await services.start('first');

    expect(first.calls).toEqual(['start:first']);
    expect(second.calls).toEqual([]);
    expect(services.isRunning('first')).toBe(true);
    expect(services.isRunning('second')).toBe(false);
  });

  it('does not start a service that is already running', async () => {
    const services = createRegistry();
    const service = new TestService('heartbeat');
    services.register(service);

    await services.start('heartbeat');
    await services.start('heartbeat');

    expect(service.calls).toEqual(['start:heartbeat']);
  });

  it('stops a single service without touching the others', async () => {
    const services = createRegistry();
    const first = new TestService('first');
    const second = new TestService('second');
    services.register(first);
    services.register(second);
    await services.startAll();

    await services.stop('first');

    expect(first.calls).toEqual(['start:first', 'stop:first']);
    expect(second.calls).toEqual(['start:second']);
    expect(services.isRunning('first')).toBe(false);
    expect(services.isRunning('second')).toBe(true);
  });

  it('does not stop a service that is not running', async () => {
    const services = createRegistry();
    const service = new TestService('heartbeat');
    services.register(service);

    await services.stop('heartbeat');
    expect(service.calls).toEqual([]);

    await services.start('heartbeat');
    await services.stop('heartbeat');
    await services.stop('heartbeat');

    expect(service.calls).toEqual(['start:heartbeat', 'stop:heartbeat']);
  });

  it('throws when controlling an unknown service', async () => {
    const services = createRegistry();

    await expect(services.start('missing')).rejects.toThrow(
      'Service "missing" is not registered',
    );
    await expect(services.stop('missing')).rejects.toThrow(
      'Service "missing" is not registered',
    );
  });

  it('does not mark a service running when its start fails', async () => {
    const services = createRegistry();
    services.register(new FailingService('failing'));

    await expect(services.start('failing')).rejects.toThrow('boom');

    expect(services.isRunning('failing')).toBe(false);
  });

  it('isolates start failures and continues with other services', async () => {
    const health = new HealthRegistry();
    const services = new ServiceRegistry<TestClient>(health, contextBase);
    const failing = new FailingService('failing');
    const ready = new ReadyService('ready');
    services.register(failing);
    services.register(ready);

    await services.startAll();

    expect(failing.calls).toEqual([]);
    expect(ready.calls).toEqual(['start:ready']);
    expect(health.report()).toEqual({
      ready: false,
      components: { failing: false, ready: true },
    });
  });

  it('stops services in reverse registration order', async () => {
    const order: string[] = [];
    const services = createRegistry();
    services.register(new TestService('first', order));
    services.register(new TestService('second', order));
    await services.startAll();
    order.length = 0;

    await services.stopAll();

    expect(order).toEqual(['stop:second', 'stop:first']);
  });

  it('continues stopping services after a stop failure', async () => {
    const order: string[] = [];
    const services = createRegistry();
    services.register(new FailingStopService('failing', order));
    services.register(new TestService('second', order));
    await services.startAll();
    order.length = 0;

    await services.stopAll();

    expect(order).toEqual(['stop:second', 'stop:failing']);
    expect(services.isRunning('failing')).toBe(false);
    expect(services.isRunning('second')).toBe(false);
  });

  it('does not mutate health when services stop', async () => {
    const health = new HealthRegistry();
    const services = new ServiceRegistry<TestClient>(health, contextBase);
    const service = new ReadyService('ready');
    services.register(service);

    await services.startAll();
    await services.stopAll();

    expect(service.calls).toEqual(['start:ready', 'stop:ready']);
    expect(health.isReady()).toBe(true);
  });
});
