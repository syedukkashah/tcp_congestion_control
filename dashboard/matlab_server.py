from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess, json, os, base64

app = Flask(__name__)
CORS(app)

ANALYSIS_DIR = (
    r"C:\Ibrahim\Personal\University Stuff\Computer Networks"
    r"\Project\TCP Congestion Control\tcp_congestion_control\analysis"
)

FIGURES_DIR = os.path.join(ANALYSIS_DIR, "figures")
JOB_FILE = os.path.join(ANALYSIS_DIR, "job.json")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "matlab_server"})


@app.route("/api/generate-graphs", methods=["POST"])
def generate_graphs():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "No payload"}), 400

    # 1. Write job file that plot_cwnd.m will read
    os.makedirs(FIGURES_DIR, exist_ok=True)
    with open(JOB_FILE, "w") as f:
        json.dump(data, f)

    # 2. Clear old PNGs
    for fname in os.listdir(FIGURES_DIR):
        if fname.endswith(".png"):
            os.remove(os.path.join(FIGURES_DIR, fname))

    # 3. Run MATLAB non-interactively
    # Forward-slash path works inside MATLAB strings; escaping is safe this way
    matlab_dir = ANALYSIS_DIR.replace("\\", "/")
    batch_cmd  = f"cd('{matlab_dir}'); run('plot_cwnd.m'); exit"

    try:
        result = subprocess.run(
            ["matlab", "-batch", batch_cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180,
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "MATLAB timed out (>180s)"}), 500
    except FileNotFoundError:
        return jsonify({"error": "matlab not found — is it on PATH?"}), 500

    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace")
        return jsonify({"error": err or "MATLAB non-zero exit"}), 500

    # 4. Collect generated PNGs → base64
    images = {}
    if os.path.isdir(FIGURES_DIR):
        for fname in sorted(os.listdir(FIGURES_DIR)):
            if fname.endswith(".png"):
                key = fname.replace(".png", "")
                with open(os.path.join(FIGURES_DIR, fname), "rb") as fh:
                    images[key] = base64.b64encode(fh.read()).decode()

    if not images:
        stdout = result.stdout.decode("utf-8", errors="replace")
        return jsonify({"error": "MATLAB ran but no PNGs produced", "stdout": stdout}), 500

    return jsonify({"images": images})


if __name__ == "__main__":
    print(f"[matlab_server] ANALYSIS_DIR = {ANALYSIS_DIR}")
    print("[matlab_server] Listening on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)