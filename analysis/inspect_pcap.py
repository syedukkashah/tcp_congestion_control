from scapy.all import rdpcap
from scapy.layers.inet import IP, TCP
import sys

if len(sys.argv) != 2:
    print("Usage: python3 analysis/inspect_pcap.py <pcap_file>")
    sys.exit(1)

pcap_file = sys.argv[1]
print(f"Reading {pcap_file}...")

packets = rdpcap(pcap_file)
print(f"Total packets in file: {len(packets)}")

tcp_count = 0

for i, pkt in enumerate(packets, start=1):
    if IP in pkt and TCP in pkt:
        tcp_count += 1
        print(
            f"{tcp_count}: {pkt[IP].src} -> {pkt[IP].dst} | "
            f"{pkt[TCP].sport} -> {pkt[TCP].dport} | "
            f"seq={pkt[TCP].seq} ack={pkt[TCP].ack}"
        )

print(f"Total TCP packets inspected: {tcp_count}")