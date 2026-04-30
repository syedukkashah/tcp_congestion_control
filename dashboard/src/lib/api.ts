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