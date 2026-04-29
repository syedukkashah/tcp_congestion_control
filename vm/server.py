#!/usr/bin/env python3
#pyright: ignore
"""
TCP Simulation API Server.
Runs on the Ubuntu VM, bridges React dashboard to ns-3.
Usage: python3 server.py
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

# Valid short names — tcp-compare.cc resolves these internally to TypeIds.
# tahoe -> ns3::TcpTahoe (custom subclass)
# reno  -> ns3::TcpReno  (custom subclass)
# rest  -> native ns3 types
VALID_VARIANTS = {"tahoe", "reno", "newreno", "westwood", "bic", "vegas", "hybla"}

def parse_cwnd(path):
    points = []
    if not os.path.exists(path):
        return points
    with open(path) as f:
        next(f)  # skip header
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
        t_last  = float(best.get("timeLastRxPacket",  "0").replace("+", "").replace("ns", "")) / 1e9
        t_first = float(best.get("timeFirstTxPacket", "0").replace("+", "").replace("ns", "")) / 1e9
        duration = t_last - t_first
    except Exception:
        pass
    rx_bytes = int(best.get("rxBytes", 0))
    throughput_mbps = round(rx_bytes * 8 / duration / 1e6, 4) if duration > 0 else 0
    return {
        "txPackets": tx,
        "rxPackets": rx,
        "lostPackets": lost,
        "lossRate": loss_rate,
        "avgDelayMs": avg_delay_ms,
        "throughputMbps": throughput_mbps,
    }


def run_simulation(variant_key, bandwidth, delay, queue_size, duration, out_dir):
    """
    Build the waf command and run it.
    tcp-compare.cc accepts the short variant name directly via --tcpVariant.
    Returns (proc, label_prefix_path).
    """
    run_arg = (
        "scratch/tcp-compare"
        " --tcpVariant={variant}"
        " --bandwidth={bw}"
        " --delay={dl}"
        " --queueSize={qs}"
        " --duration={dur}"
        " --outputDir={od}"
        " --label={lbl}"
    ).format(
        variant=variant_key,
        bw=bandwidth,
        dl=delay,
        qs=queue_size,
        dur=duration,
        od=out_dir,
        lbl=variant_key,
    )
    cmd = [WAF, "--run", run_arg]
    proc = subprocess.run(
        cmd,
        cwd=NS3_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=180,
    )
    return proc


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "ns3": NS3_DIR})


@app.route("/api/simulate", methods=["POST"])
def simulate():
    body = request.json or {}
    variant_key = body.get("variant", "newreno").lower()
    bandwidth   = body.get("bandwidth", "1Mbps")
    delay       = body.get("delay", "10ms")
    queue_size  = int(body.get("queueSize", 20))
    duration    = float(body.get("duration", 20.0))

    if variant_key not in VALID_VARIANTS:
        return jsonify({"error": "Unknown variant: " + variant_key, "valid": sorted(VALID_VARIANTS)}), 400

    out_dir = tempfile.mkdtemp(prefix="tcpsim_")
    try:
        proc = run_simulation(variant_key, bandwidth, delay, queue_size, duration, out_dir)
        if proc.returncode != 0:
            return jsonify({
                "error":  "ns-3 failed",
                "stderr": proc.stderr.decode()[-2000:],
            }), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Simulation timed out"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    prefix  = os.path.join(out_dir, variant_key)
    cwnd    = parse_cwnd(prefix + "-cwnd.csv")
    metrics = parse_flowmon(prefix + "-flowmon.xml")
    shutil.rmtree(out_dir, ignore_errors=True)

    return jsonify({
        "label":   variant_key.upper(),
        "variant": variant_key,
        "params":  {
            "bandwidth": bandwidth,
            "delay":     delay,
            "queueSize": queue_size,
            "duration":  duration,
        },
        "cwnd":    cwnd,
        "metrics": metrics,
    })


@app.route("/api/compare", methods=["POST"])
def compare():
    body      = request.json or {}
    variants  = body.get("variants",  ["newreno", "westwood"])
    bandwidth = body.get("bandwidth", "1Mbps")
    delay     = body.get("delay",     "10ms")
    queue_size = int(body.get("queueSize", 20))
    duration   = float(body.get("duration", 20.0))

    # Validate all requested variants up front
    invalid = [v for v in variants if v.lower() not in VALID_VARIANTS]
    if invalid:
        return jsonify({"error": "Unknown variants: " + str(invalid), "valid": sorted(VALID_VARIANTS)}), 400

    results = []
    for v in variants:
        v = v.lower()
        out_dir = tempfile.mkdtemp(prefix="tcpsim_")
        try:
            proc = run_simulation(v, bandwidth, delay, queue_size, duration, out_dir)
            if proc.returncode != 0:
                shutil.rmtree(out_dir, ignore_errors=True)
                return jsonify({
                    "error":  "ns-3 failed for variant: " + v,
                    "stderr": proc.stderr.decode()[-1000:],
                }), 500
        except subprocess.TimeoutExpired:
            shutil.rmtree(out_dir, ignore_errors=True)
            return jsonify({"error": "Timed out on variant: " + v}), 500
        except Exception as e:
            shutil.rmtree(out_dir, ignore_errors=True)
            return jsonify({"error": str(e)}), 500

        prefix  = os.path.join(out_dir, v)
        cwnd    = parse_cwnd(prefix + "-cwnd.csv")
        metrics = parse_flowmon(prefix + "-flowmon.xml")
        shutil.rmtree(out_dir, ignore_errors=True)

        results.append({
            "label":   v.upper(),
            "variant": v,
            "cwnd":    cwnd,
            "metrics": metrics,
        })

    return jsonify({
        "variants": results,
        "params": {
            "bandwidth": bandwidth,
            "delay":     delay,
            "queueSize": queue_size,
            "duration":  duration,
        },
    })


if __name__ == "__main__":
    print("TCP Sim API running on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)