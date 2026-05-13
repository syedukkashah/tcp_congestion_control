import { API_BASE } from './constants';
import type { SimParams, SimResult, CompareResult, Variant } from './types';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export function checkHealth(): Promise<{ status: string }> {
  return fetch(`${API_BASE}/api/health`).then(r => r.json());
}

export function simulate(params: SimParams): Promise<SimResult> {
  return postJson<SimResult>('/api/simulate', {
    variant:    params.variant,
    bandwidth:  params.bandwidth,
    delay:      params.delay,
    queueSize:  params.queueSize,
    duration:   params.duration,
    label:      params.label ?? params.variant,
  });
}

export interface CompareRequest {
  variants: Variant[];
  bandwidth: string;
  delay: string;
  queueSize: number;
  duration: number;
}

export function compare(req: CompareRequest): Promise<CompareResult> {
  return postJson<CompareResult>('/api/compare', req);
}

const MATLAB_BASE = "http://localhost:5001";
 
export interface MatlabImages {
  cwnd?: string;        // base64 PNG
  throughput?: string;
  delay?: string;
  loss?: string;
}
 
export async function generateGraphsSingle(
  variant: string,
  cwnd: { time: number; cwnd: number }[],
  metrics: Record<string, number>
): Promise<MatlabImages> {
  const res = await fetch(`${MATLAB_BASE}/api/generate-graphs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "single", variant, cwnd, metrics }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error ?? "matlab_server error");
  }
  const data = await res.json();
  return data.images as MatlabImages;
}
 
export async function generateGraphsCompare(
  variants: { label: string; variant: string; cwnd: { time: number; cwnd: number }[]; metrics: Record<string, number> }[]
): Promise<MatlabImages> {
  const res = await fetch(`${MATLAB_BASE}/api/generate-graphs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "compare", variants }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error ?? "matlab_server error");
  }
  const data = await res.json();
  return data.images as MatlabImages;
}