# Python script for packet inspection using Scapy
from scapy.all import sniff, TCP, IP

# Define a callback function to process packets
def process_packet(packet):
    if packet.haslayer(IP) and packet.haslayer(TCP):
        ip_layer = packet[IP]
        tcp_layer = packet[TCP]
        print(f"Packet: {ip_layer.src} -> {ip_layer.dst} | {tcp_layer.sport} -> {tcp_layer.dport}")

# Start sniffing packets
print("Starting packet sniffing...")
sniff(filter="tcp", prn=process_packet, store=0)