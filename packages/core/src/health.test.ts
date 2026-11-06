import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  HealthRegistry,
  HealthState,
  type Health,
  type HealthReport,
} from './health.js';

describe('health', () => {
  it('defines the readiness contract', () => {
    expectTypeOf<Health>().toEqualTypeOf<{
      isReady(): boolean;
      markReady(): void;
      markNotReady(): void;
    }>();
  });

  it('tracks readiness state', () => {
    const health = new HealthState();

    expect(health.isReady()).toBe(false);

    health.markReady();
    expect(health.isReady()).toBe(true);

    health.markNotReady();
    expect(health.isReady()).toBe(false);
  });
});

describe('HealthRegistry', () => {
  it('is not ready when no components are registered', () => {
    expect(new HealthRegistry().isReady()).toBe(false);
  });

  it('returns a distinct handle for each component', () => {
    const registry = new HealthRegistry();
    const first = registry.register('first');
    const second = registry.register('second');

    first.markReady();

    expect(first.isReady()).toBe(true);
    expect(second.isReady()).toBe(false);
  });

  it('is ready only when every required component is ready', () => {
    const registry = new HealthRegistry();
    const first = registry.register('first');
    const second = registry.register('second');

    first.markReady();
    expect(registry.isReady()).toBe(false);

    second.markReady();
    expect(registry.isReady()).toBe(true);
  });

  it('ignores optional components', () => {
    const registry = new HealthRegistry();
    const required = registry.register('required');
    registry.register('optional', { required: false });

    required.markReady();

    expect(registry.isReady()).toBe(true);
  });

  it('rejects duplicate component names', () => {
    const registry = new HealthRegistry();
    registry.register('client');

    expect(() => registry.register('client')).toThrow(
      'Health "client" is already registered',
    );
  });

  it('returns the registered handle by name', () => {
    const registry = new HealthRegistry();
    const handle = registry.register('client');

    expect(registry.for('client')).toBe(handle);
  });

  it('rejects an unknown component name', () => {
    const registry = new HealthRegistry();

    expect(() => registry.for('missing')).toThrow(
      'Health "missing" is not registered',
    );
  });

  it('reports the current state of every component', () => {
    const registry = new HealthRegistry();
    const client = registry.register('client');
    registry.register('optional', { required: false });
    client.markReady();

    expectTypeOf(registry.report()).toEqualTypeOf<HealthReport>();

    expect(registry.report()).toEqual({
      ready: true,
      components: {
        client: true,
        optional: false,
      },
    });
  });

  it('marks every component as not ready', () => {
    const registry = new HealthRegistry();
    const first = registry.register('first');
    const second = registry.register('second');
    first.markReady();
    second.markReady();

    registry.markAllNotReady();

    expect(registry.isReady()).toBe(false);
    expect(first.isReady()).toBe(false);
    expect(second.isReady()).toBe(false);
  });
});
