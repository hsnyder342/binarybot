import type { AppConfig } from './config.js';
import type {
  Health,
  HealthRegistrationOptions,
  HealthRegistry,
} from './health.js';
import type { Logger } from './logger.js';

export interface ServiceContext<T = unknown> {
  readonly client: T;
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly health: Health;
}

export type ServiceContextBase<T = unknown> = Omit<ServiceContext<T>, 'health'>;

export interface Service<T = unknown> {
  readonly name: string;
  start(context: ServiceContext<T>): Promise<void> | void;
  stop(): Promise<void> | void;
}

export class ServiceRegistry<T = unknown> {
  readonly services = new Map<string, Service<T>>();

  readonly #running = new Set<string>();

  constructor(
    private readonly healthRegistry: HealthRegistry,
    private readonly context: ServiceContextBase<T>,
  ) {}

  register(
    service: Service<T>,
    options: HealthRegistrationOptions = {},
  ): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service "${service.name}" is already registered`);
    }

    this.healthRegistry.register(service.name, options);

    this.services.set(service.name, service);
  }

  names(): readonly string[] {
    return [...this.services.keys()];
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  isRunning(name: string): boolean {
    return this.#running.has(name);
  }

  async start(name: string): Promise<void> {
    const service = this.#require(name);

    if (this.#running.has(name)) {
      return;
    }

    await service.start({
      ...this.context,
      health: this.healthRegistry.for(name),
    });

    this.#running.add(name);
  }

  async stop(name: string): Promise<void> {
    const service = this.#require(name);

    if (!this.#running.has(name)) {
      return;
    }

    try {
      await service.stop();
    } finally {
      this.#running.delete(name);
    }
  }

  async startAll(): Promise<void> {
    for (const name of this.services.keys()) {
      try {
        await this.start(name);
      } catch (error) {
        this.context.logger.error({ err: error, service: name },
          'service failed to start');
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const name of [...this.services.keys()].reverse()) {
      try {
        await this.stop(name);
      } catch (error) {
        this.context.logger.error({ err: error, service: name },
          'service failed to stop');
      }
    }
  }

  #require(name: string): Service<T> {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service "${name}" is not registered`);
    }

    return service;
  }
}
