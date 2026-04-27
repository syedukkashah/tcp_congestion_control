import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts'

const API = 'http://192.168.100.165:5000'

const VARIANTS = ['newreno', 'westwood', 'bic', 'vegas', 'hybla']

interface SimConfig {
  tcpVariant: string
  bandwidth: string
  delay: string
  queueSize: number
  duration: number
}

interface CwndRow { time: number; cwnd: number }
interface Metrics {
  throughputMbps: number
  avgDelayMs: number
  lossRate: number
  txPackets: number
  rxPackets: number
}

export default function App() {
  const [config, setConfig] = useState<SimConfig>({
    tcpVariant: 'newreno',
    bandwidth: '1Mbps',
    delay: '10ms',
    queueSize: 20,
    duration: 20,
  })
  const [status, setStatus] = useState<string>('')
  const [cwndData, setCwndData] = useState<CwndRow[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: name === 'queueSize' || name === 'duration' ? Number(value) : value }))
  }

  const runSimulation = async () => {
    setLoading(true)
    setStatus('Running simulation...')
    setCwndData([])
    try {
      const res = await fetch(`${API}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tcpVariant: `ns3::Tcp${config.tcpVariant.charAt(0).toUpperCase() + config.tcpVariant.slice(1)}`,
          bandwidth: config.bandwidth,
          delay: config.delay,
          queueSize: config.queueSize,
          duration: config.duration,
          label: config.tcpVariant,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Simulation failed')
      setCwndData(data.cwnd)
      setMetrics(data.metrics)
      setStatus('Done.')
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>TCP Congestion Control Simulator</h1>
      <p style={{ color: '#888', marginBottom: '24px' }}>ns-3.30 · 4-node dumbbell · DropTail</p>

      {/* Config Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div>
          <label>Variant</label><br />
          <select name="tcpVariant" value={config.tcpVariant} onChange={handleChange}
            style={{ width: '100%', padding: '6px' }}>
            {VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label>Bandwidth</label><br />
          <input name="bandwidth" value={config.bandwidth} onChange={handleChange}
            style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>Delay</label><br />
          <input name="delay" value={config.delay} onChange={handleChange}
            style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>Queue Size</label><br />
          <input name="queueSize" type="number" value={config.queueSize} onChange={handleChange}
            style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>Duration (s)</label><br />
          <input name="duration" type="number" value={config.duration} onChange={handleChange}
            style={{ width: '100%', padding: '6px' }} />
        </div>
      </div>

      <button onClick={runSimulation} disabled={loading}
        style={{ padding: '10px 28px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
        {loading ? 'Simulating...' : 'Run Simulation'}
      </button>
      {status && <p style={{ color: status.startsWith('Error') ? 'red' : 'green' }}>{status}</p>}

      {/* Topology SVG */}
      <div style={{ margin: '24px 0' }}>
        <h2>Topology</h2>
        <svg width="600" height="100" style={{ background: '#f9f9f9', borderRadius: '8px' }}>
          {/* Nodes */}
          {[['n0', 60], ['r1', 200], ['r2', 380], ['n3', 520]].map(([label, x]) => (
            <g key={label}>
              <circle cx={Number(x)} cy={50} r={20} fill="#4a90d9" />
              <text x={Number(x)} y={55} textAnchor="middle" fill="white" fontSize={12}>{label}</text>
            </g>
          ))}
          {/* Links */}
          <line x1={80} y1={50} x2={180} y2={50} stroke="#333" strokeWidth={2} />
          <line x1={220} y1={50} x2={360} y2={50} stroke="#e55" strokeWidth={3} />
          <line x1={400} y1={50} x2={500} y2={50} stroke="#333" strokeWidth={2} />
          {/* Labels */}
          <text x={130} y={40} textAnchor="middle" fontSize={10} fill="#555">10Mbps/2ms</text>
          <text x={290} y={40} textAnchor="middle" fontSize={10} fill="#e55">{config.bandwidth}/{config.delay} ⬅ bottleneck</text>
          <text x={450} y={40} textAnchor="middle" fontSize={10} fill="#555">10Mbps/2ms</text>
        </svg>
      </div>

      {/* cwnd Chart */}
      {cwndData.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2>Congestion Window (cwnd)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cwndData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -4 }} />
              <YAxis label={{ value: 'cwnd (bytes)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cwnd" dot={false} stroke="#4a90d9" name={config.tcpVariant} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results Chart */}
      {metrics && (
        <div style={{ marginBottom: '32px' }}>
          <h2>Flow Metrics</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[metrics]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="throughputMbps" fill="#4a90d9" name="Throughput (Mbps)" />
              <Bar dataKey="lossRate" fill="#e55" name="Loss Rate (%)" />
              <Bar dataKey="avgDelayMs" fill="#f0a500" name="Avg Delay (ms)" />
            </BarChart>
          </ResponsiveContainer>
          <p>TX: {metrics.txPackets} | RX: {metrics.rxPackets} | Loss: {metrics.lossRate}% | Delay: {metrics.avgDelayMs}ms | Throughput: {metrics.throughputMbps}Mbps</p>
        </div>
      )}
    </div>
  )
}