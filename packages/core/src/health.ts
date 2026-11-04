export interface Health {
  isReady(): boolean;
  markReady(): void;
  markNotReady(): void;
}
