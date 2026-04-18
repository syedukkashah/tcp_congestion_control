% Read CSV files
newreno = readtable('newreno-results.csv');
linuxreno = readtable('linuxreno-results.csv');

% ===== Throughput =====
figure;
bar([newreno.throughputMbps(1), linuxreno.throughputMbps(1)]);
set(gca, 'XTickLabel', {'TcpNewReno', 'TcpLinuxReno'});
title('Throughput Comparison');
ylabel('Throughput (Mbps)');
grid on;

% ===== Delay =====
figure;
bar([newreno.meanDelayMs(1), linuxreno.meanDelayMs(1)]);
set(gca, 'XTickLabel', {'TcpNewReno', 'TcpLinuxReno'});
title('Mean Delay Comparison');
ylabel('Delay (ms)');
grid on;

% ===== Packet Loss =====
figure;
bar([newreno.lostPackets(1), linuxreno.lostPackets(1)]);
set(gca, 'XTickLabel', {'TcpNewReno', 'TcpLinuxReno'});
title('Packet Loss Comparison');
ylabel('Lost Packets');
grid on;