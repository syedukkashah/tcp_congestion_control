# TCP Congestion Control Simulator

**Computer Networks Course Project — FAST-NUCES Karachi**  
Ibrahim Johar Farooqi (23K-0074) · Syed Ukkashah Ahmed (23K-0055)

---

A full-stack TCP congestion control simulator built on **ns-3.30**, with a React dashboard and MATLAB graph generation. Simulate 7 TCP variants across a configurable dumbbell topology, compare them side-by-side, and export publication-quality figures.

---

## Features

- **7 TCP variants** — Tahoe, Reno, NewReno, Westwood, BIC, Vegas, Hybla
- **5 predefined scenarios** — Slow Start, Congestion Collapse, High BDP Pipe, Bufferbloat, Fair Recovery + Custom mode
- **Compare mode** — run two variants simultaneously, overlay cwnd traces, side-by-side metrics
- **Animated topology** — SVG packet flow + per-scenario annotations (loss events, queue fill)
- **Progressive cwnd playback** — line draws in after simulation completes
- **MATLAB integration** — auto-generates 4 publication-quality figures after every simulation
- **CSV export** — download raw cwnd data for offline analysis

---

## Architecture

```
Windows Host
├── React Dashboard        (localhost:5173)  — Vite + TypeScript + Tailwind v4
├── matlab_server.py       (localhost:5001)  — Flask MATLAB bridge
└── analysis/plot_cwnd.m                    — MATLAB graph script

Ubuntu VM (192.168.100.165)
├── server.py              (:5000)           — Flask API
└── ns-3/scratch/tcp-compare.cc             — ns-3 simulation
```

---

## Prerequisites

| Component | Version | Where |
|---|---|---|
| Node.js | 22 | Windows |
| Python | 3.x | Windows (matlab_server.py) |
| Python | 3.6 | Ubuntu VM (server.py) |
| ns-3 | 3.30 | Ubuntu VM |
| GCC | 8 | Ubuntu VM |
| Flask + flask-cors | latest | both machines |
| MATLAB | R2019b+ | Windows |
| VMware Workstation/Player | any | Windows |

---

## Setup

### 1. Ubuntu VM — ns-3 + Flask

```bash
# Build ns-3 (one time)
cd ~/ns-3
./waf configure --build-profile=optimized
./waf build

# Copy simulation script
cp tcp-compare.cc ~/ns-3/scratch/

# Install Flask
pip install flask flask-cors

# Set static IP (if not already set)
sudo ip addr add 192.168.100.165/24 dev ens33

# Start API server
python3 ~/server.py
```

### 2. Windows — MATLAB bridge

```powershell
pip install flask flask-cors
python matlab_server.py
# keep this terminal open
```

### 3. Windows — React dashboard

```powershell
cd dashboard
npm install
npm run dev
# open http://localhost:5173
```

---

## Usage

1. Ensure all three servers are running (Flask VM, matlab_server, npm dev)
2. Open `http://localhost:5173`
3. Ticker bar should show **API · ONLINE** in green
4. Select a scenario or configure Custom
5. Click **▶ Run Simulation**
6. Results: topology animation → cwnd chart → metrics → MATLAB figures
7. Use **≡ Compare** to run two variants side-by-side
8. Click **↓ export csv** to download raw data

---

## Project Structure

```
tcp_congestion_control/
├── dashboard/                  # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── lib/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   ├── scenarios.ts
│   │   │   └── api.ts
│   │   └── components/
│   │       ├── ticker.tsx
│   │       ├── header.tsx
│   │       ├── scenariopicker.tsx
│   │       ├── configpanel.tsx
│   │       ├── topology.tsx
│   │       ├── cwndchart.tsx
│   │       ├── metricspanel.tsx
│   │       └── matlabgraphs.tsx
│   └── package.json
├── analysis/
│   ├── plot_cwnd.m             # MATLAB graph script
│   └── figures/                # generated PNGs (gitignored)
├── vm/
│   └── server.py               # Flask API (runs on Ubuntu VM)
├── matlab_server.py            # MATLAB bridge (runs on Windows)
└── README.md
```

---

## TCP Variants

| Variant | Year | Key Behaviour |
|---|---|---|
| Tahoe | 1988 | cwnd → 1 MSS on any loss, restart slow start |
| Reno | 1990 | Fast recovery: cwnd → ssthresh on 3 dup ACKs |
| NewReno | 1999 | Partial ACK handling during fast recovery |
| Westwood | 2001 | Bandwidth estimation for smarter ssthresh |
| BIC | 2004 | Binary search between safe and congested cwnd |
| Vegas | 1994 | Delay-based proactive congestion avoidance |
| Hybla | 2004 | RTT-independent growth for high-latency links |

---

## Predefined Scenarios

| # | Scenario | Variant | Params | Demonstrates |
|---|---|---|---|---|
| 01 | Slow Start | NewReno | 1Mbps, 10ms, q=20 | Exponential cwnd growth |
| 02 | Congestion Collapse | Tahoe | 512Kbps, 50ms, q=5 | Repeated cwnd resets |
| 03 | High BDP Pipe | Hybla | 1Mbps, 100ms, q=50 | RTT-independent growth |
| 04 | Bufferbloat | NewReno | 1Mbps, 10ms, q=200 | Latency spike, no loss |
| 05 | Fair Recovery | Westwood | 1Mbps, 10ms, q=20 | BW-estimated recovery |
| 06 | Custom | any | user-defined | — |

---

## API Reference

```
GET  /api/health
POST /api/simulate       { variant, bandwidth, delay, queueSize, duration }
POST /api/compare        { variants:[], bandwidth, delay, queueSize, duration }
GET  /api/export-csv
GET  /api/export-compare-csv
```

---

## Known Constraints

- MATLAB cold-start takes 15–30s per invocation (`matlab -batch` limitation)
- VM Python is 3.6 — no walrus operator, no `capture_output`
- VM IP can shift after `dhclient` — fix: `sudo ip addr add 192.168.100.165/24 dev ens33`
- MATLAB integration only works locally — not available on Vercel deployment

---

## References

1. V. Jacobson, "Congestion Avoidance and Control," ACM SIGCOMM, 1988
2. S. Floyd & T. Henderson, "The NewReno Modification," RFC 2582, 1999
3. S. Mascolo et al., "TCP Westwood," ACM MobiCom, 2001
4. L. Xu et al., "BIC for Fast Long-Distance Networks," IEEE INFOCOM, 2004
5. L. Brakmo & L. Peterson, "TCP Vegas," IEEE JSAC, 1995
6. C. Caini & R. Firrincieli, "TCP Hybla," Int. J. Satellite Comm., 2004
7. ns-3 Network Simulator v3.30 — https://www.nsnam.org

## Video Demo + Project Report Uploaded In This Repository