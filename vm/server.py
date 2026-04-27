#!/usr/bin/env python3
#pyright: ignore
"""
TCP Simulation API Server.
runs on the Ubuntu VM, bridges React dashboard to ns-3.
usage: python3 server.py
"""

import os
import json
import subprocess
import tempfile
import shutil
import xml.etree.ElementTree as ET
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

NS3_DIR = os.path.expanduser("~/ns-3")
WAF = os.path.join(NS3_DIR, "waf")

VARIANT_MAP = {
    "newreno": "ns3::TcpNewReno",
    "westwood": "ns3::TcpWestwood",
    "bic": "ns3::TcpBic",
    "vegas": "ns3::TcpVegas",
    "hybla": "ns3::TcpHybla",
}

def parse_cwnd(path):
    points = []
    if not os.path.exists(path):
        return points
    with open(path) as f:
        next(f)
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) == 2:
                try:
                    points.append({
                        "time": round(float(parts[0]), 4),
                        "cwnd": int(parts[1])
                    })
                except ValueError:
                    pass
    return points

def parse_flowmon(path):
    if not os.path.exists(path):
        return {}
    tree = ET.parse(path)
    root = tree.getroot()
    best, best_tx = None, 0
    for flow in root.iter("Flow"):
        tx = int(flow.get("txPackets", 0))
        if tx > best_tx:
            best_tx, best = tx, flow
    if best is None:
        return {}
    tx = int(best.get("txPackets", 0))
    rx = int(best.get("rxPackets", 0))
    lost = int(best.get("lostPackets", 0))
    raw = best.get("delaySum", "0").replace("+", "").replace("ns", "")
    delay_ns = float(raw) if raw else 0
    avg_delay_ms = round(delay_ns / rx / 1e6, 3) if rx > 0 else 0
    loss_rate = round(lost / tx * 100, 3) if tx > 0 else 0
    duration = 0
    try:
        t_last = float(best.get("timeLastRxPacket", "0").replace("+","").replace("ns","")) / 1e9
        t_first = float(best.get("timeFirstTxPacket", "0").replace("+","").replace("ns","")) / 1e9
        duration = t_last - t_first
    except Exception:
        pass
    rx_bytes = int(best.get("rxBytes", 0))
    throughput_mbps = round(rx_bytes * 8 / duration / 1e6, 4) if duration > 0 else 0
    return {
        "txPackets": tx, "rxPackets": rx, "lostPackets": lost,
        "lossRate": loss_rate, "avgDelayMs": avg_delay_ms,
        "throughputMbps": throughput_mbps,
    }

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "ns3": NS3_DIR})

@app.route("/api/simulate", methods=["POST"])
def simulate():
    body = request.json or {}
    variant_key = body.get("variant", "newreno")
    bandwidth = body.get("bandwidth", "1Mbps")
    delay = body.get("delay", "10ms")
    queue_size = int(body.get("queueSize", 20))
    duration = float(body.get("duration", 20.0))
    variant_flag = VARIANT_MAP.get(variant_key, "ns3::TcpNewReno")
    out_dir = tempfile.mkdtemp(prefix="tcpsim_")
    try:
        cmd = [WAF, "--run",
               f"scratch/tcp-sim --tcpVariant={variant_flag} --bandwidth={bandwidth} "
               f"--delay={delay} --queueSize={queue_size} --duration={duration} "
               f"--outputDir={out_dir} --label={variant_key}"]
        proc = subprocess.run(cmd, cwd=NS3_DIR, capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            return jsonify({"error": "ns-3 failed", "stderr": proc.stderr[-2000:]}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    prefix  = os.path.join(out_dir, variant_key)
    cwnd    = parse_cwnd(prefix + "-cwnd.csv")
    metrics = parse_flowmon(prefix + "-flowmon.xml")
    shutil.rmtree(out_dir, ignore_errors=True)
    return jsonify({"label": variant_key.upper(), "variant": variant_flag,
                    "params": {"bandwidth": bandwidth, "delay": delay,
                               "queueSize": queue_size, "duration": duration},
                    "cwnd": cwnd, "metrics": metrics})

@app.route("/api/compare", methods=["POST"])
def compare():
    body = request.json or {}
    variants = body.get("variants",  ["newreno", "westwood"])
    bandwidth = body.get("bandwidth", "1Mbps")
    delay = body.get("delay", "10ms")
    queue_size = int(body.get("queueSize", 20))
    duration = float(body.get("duration", 20.0))
    results = []
    for v in variants[:2]:
        variant_flag = VARIANT_MAP.get(v, "ns3::TcpNewReno")
        out_dir = tempfile.mkdtemp(prefix="tcpsim_")
        try:
            cmd = [WAF, "--run",
                   f"scratch/tcp-sim --tcpVariant={variant_flag} --bandwidth={bandwidth} "
                   f"--delay={delay} --queueSize={queue_size} --duration={duration} "
                   f"--outputDir={out_dir} --label={v}"]
            proc = subprocess.run(cmd, cwd=NS3_DIR, capture_output=True, text=True, timeout=180)
            if proc.returncode != 0:
                return jsonify({"error": f"Failed for {v}", "stderr": proc.stderr[-1000:]}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        prefix = os.path.join(out_dir, v)
        cwnd = parse_cwnd(prefix + "-cwnd.csv")
        metrics = parse_flowmon(prefix + "-flowmon.xml")
        shutil.rmtree(out_dir, ignore_errors=True)
        results.append({"label": v.upper(), "variant": variant_flag,
                        "cwnd": cwnd, "metrics": metrics})
    return jsonify({"variants": results,
                    "params": {"bandwidth": bandwidth, "delay": delay,
                               "queueSize": queue_size, "duration": duration}})

if __name__ == "__main__":
    print("TCP Sim API running on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)