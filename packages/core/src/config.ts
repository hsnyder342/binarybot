export type LogLevel =
  | 'FATAL'
  | 'ERROR'
  | 'WARN'
  | 'INFO'
  | 'DEBUG'
  | 'TRACE'
  | 'SILENT';

export interface AppConfig {
  readonly discordToken: string;
  readonly discordGuildId: string;
  readonly logLevel: LogLevel;
}
