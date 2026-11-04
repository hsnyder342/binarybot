import type { AppConfig } from './config.js';
import type { Health } from './health.js';
import type { Logger } from './logger.js';

export interface ServiceContext<T = unknown> {
  readonly client: T;
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly health: Health;
}

export interface Service<T = unknown> {
  readonly name: string;
  start(context: ServiceContext<T>): Promise<void> | void;
  stop(): Promise<void> | void;
}

export class ServiceRegistry<T = unknown> {
  readonly services = new Map<string, Service<T>>();

  register(service: Service<T>): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service "${service.name}" is already registered`);
    }
    this.services.set(service.name, service);
  }

  async startAll(context: ServiceContext<T>) {
    for (const service of this.services.values()) {
      try {
        await service.start(context);
      } catch (error) {
        context.logger.error({ err: error, service: service.name },
          'service failed to start');
      }
    }
  }

  async stopAll(context: ServiceContext<T>) {
    for (const service of this.services.values()) {
      try {
        await service.stop();
      } catch (error) {
        context.logger.error({ err: error, service: service.name },
          'service failed to stop');
      }
    }
  }
}
