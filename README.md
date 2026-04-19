./waf build -j1
./waf --run "scratch/tcp-tahoe-reno-compare --tcpVariant=TcpTahoe --resultsFile=results-tahoe.csv --cwndFile=cwnd-tahoe.csv"
./waf --run "scratch/tcp-tahoe-reno-compare --tcpVariant=TcpReno --resultsFile=results-reno.csv --cwndFile=cwnd-reno.csv
