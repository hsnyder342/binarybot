import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Health } from './health.js';

class TestHealth implements Health {
  #ready = false;

  isReady(): boolean {
    return this.#ready;
  }

  markReady(): void {
    this.#ready = true;
  }

  markNotReady(): void {
    this.#ready = false;
  }
}

describe('health', () => {
  it('defines the readiness contract', () => {
    expectTypeOf<Health>().toEqualTypeOf<{
      isReady(): boolean;
      markReady(): void;
      markNotReady(): void;
    }>();
  });

  it('supports a readiness lifecycle implementation', () => {
    const health: Health = new TestHealth();

    expect(health.isReady()).toBe(false);

    health.markReady();
    expect(health.isReady()).toBe(true);

    health.markNotReady();
    expect(health.isReady()).toBe(false);
  });
});
