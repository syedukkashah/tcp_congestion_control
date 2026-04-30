import type { Variant } from './types';

export const API_BASE = 'http://192.168.100.165:5000';

export const VARIANTS: { id: Variant; label: string; ns3Class: string; note: string }[] = [
  { id: 'tahoe',    label: 'Tahoe',    ns3Class: 'ns3::TcpTahoe',    note: 'cwnd → 1 on loss' },
  { id: 'reno',     label: 'Reno',     ns3Class: 'ns3::TcpReno',     note: 'fast retransmit' },
  { id: 'newreno',  label: 'NewReno',  ns3Class: 'ns3::TcpNewReno',  note: 'partial ACK recovery' },
  { id: 'westwood', label: 'Westwood', ns3Class: 'ns3::TcpWestwood', note: 'bandwidth estimation' },
  { id: 'bic',      label: 'BIC',      ns3Class: 'ns3::TcpBic',      note: 'binary search' },
  { id: 'vegas',    label: 'Vegas',    ns3Class: 'ns3::TcpVegas',    note: 'delay-based' },
  { id: 'hybla',    label: 'Hybla',    ns3Class: 'ns3::TcpHybla',    note: 'high-RTT compensation' },
];

export const VARIANT_IDS: Variant[] = VARIANTS.map(v => v.id);

export const COMPARE_PALETTE: Record<Variant, string> = {
  tahoe:    '#f97316', // accent
  reno:     '#fb923c',
  newreno:  '#38bdf8', // data
  westwood: '#4ade80',
  bic:      '#a78bfa',
  vegas:    '#fbbf24',
  hybla:    '#f472b6',
};