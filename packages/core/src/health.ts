export interface Health {
  isReady(): boolean;
  markReady(): void;
  markNotReady(): void;
}

export class HealthState implements Health {
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

export interface HealthRegistrationOptions {
  readonly required?: boolean;
}

export interface HealthReport {
  readonly ready: boolean;
  readonly components: Readonly<Record<string, boolean>>;
}

interface HealthEntry {
  readonly health: Health;
  readonly required: boolean;
}

export class HealthRegistry {
  readonly #components = new Map<string, HealthEntry>();

  /**
   * Register a named component and return the handle it owns.
   *
   * @param name - unique component name
   * @param options - whether the component gates readiness, defaults to required
   * @returns the component's writable health handle
   */
  register(
    name: string,
    options: HealthRegistrationOptions = {},
  ): Health {
    if (this.#components.has(name)) {
      throw new Error(`Health "${name}" is already registered`);
    }

    const health = new HealthState();
    this.#components.set(name, {
      health,
      required: options.required ?? true,
    });

    return health;
  }

  /**
   * Return the handle registered under a component name.
   *
   * @param name - registered component name
   * @returns the component's health handle
   */
  for(name: string): Health {
    const entry = this.#components.get(name);

    if (!entry) {
      throw new Error(`Health "${name}" is not registered`);
    }

    return entry.health;
  }

  /**
   * Readiness is false until at least one component is registered, then true
   * only while every required component reports ready.
   */
  isReady(): boolean {
    if (this.#components.size === 0) {
      return false;
    }

    for (const { health, required } of this.#components.values()) {
      if (required && !health.isReady()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Snapshot the current state of every component.
   */
  report(): HealthReport {
    const components: Record<string, boolean> = {};

    for (const [name, { health }] of this.#components) {
      components[name] = health.isReady();
    }

    return {
      ready: this.isReady(),
      components,
    };
  }

  /**
   * Mark every registered component as not ready, for shutdown.
   */
  markAllNotReady(): void {
    for (const { health } of this.#components.values()) {
      health.markNotReady();
    }
  }
}
