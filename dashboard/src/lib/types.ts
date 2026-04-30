export type Variant =
  | 'tahoe'
  | 'reno'
  | 'newreno'
  | 'westwood'
  | 'bic'
  | 'vegas'
  | 'hybla';

export interface SimParams {
  variant: Variant;
  bandwidth: string;   // e.g. "1Mbps", "512Kbps"
  delay: string;       // e.g. "10ms"
  queueSize: number;
  duration: number;    // seconds
  label?: string;
}

export interface CwndPoint {
  time: number;
  cwnd: number;
}

export interface Metrics {
  throughputMbps: number;
  avgDelayMs: number;
  lossRate: number;
  txPackets: number;
  rxPackets: number;
}

export interface SimResult {
  cwnd: CwndPoint[];
  metrics: Metrics;
}

export interface CompareResultEntry {
  label: string;
  variant: Variant;
  cwnd: CwndPoint[];
  metrics: Metrics;
}

export interface CompareResult {
  variants: CompareResultEntry[];
  params: Omit<SimParams, 'variant' | 'label'>;
}

export interface Scenario {
  id: string;
  index: string;          // "01", "02", ...
  title: string;          // "Slow Start"
  story: string;          // one-liner
  variant: Variant | null;// null only for 'custom'
  bandwidth: string;
  delay: string;
  queueSize: number;
  duration: number;
  isCustom?: boolean;
}