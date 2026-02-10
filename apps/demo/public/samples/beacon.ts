export interface BeaconStatus {
  signal: 'idle' | 'active';
  strength: number;
}

export const calibrateBeacon = (strength: number): BeaconStatus => ({
  signal: strength > 0.7 ? 'active' : 'idle',
  strength
});

export const emitPulse = (count: number) =>
  Array.from({ length: count }, (_, index) => `pulse-${index}`);
