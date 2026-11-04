import type { AppConfig } from './config.js';
import type { Health } from './health.js';
import type { Logger } from './logger.js';

export interface ServiceContext<TClient = unknown> {
  readonly client: TClient;
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly health: Health;
}

export interface Service<TClient = unknown> {
  readonly name: string;
  start(context: ServiceContext<TClient>): Promise<void> | void;
  stop(): Promise<void> | void;
}
