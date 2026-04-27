#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/point-to-point-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-helper.h"
#include "ns3/ipv4-flow-classifier.h"

#include <fstream>
#include <iostream>
#include <map>
#include <string>
using namespace ns3;

static Ptr<OutputStreamWrapper> g_cwndStream;

static ApplicationContainer g_sourceApp;

static void CwndTracer(Ptr<OutputStreamWrapper> stream, uint32_t oldCwnd, uint32_t newCwnd)
{
    *stream->GetStream() << Simulator::Now().GetSeconds() << "," << newCwnd << "\n";
}

static void ConnectCwndTrace()
{
    Ptr<BulkSendApplication> bulk = DynamicCast<BulkSendApplication>(g_sourceApp.Get(0));
    Ptr<Socket> sock = bulk->GetSocket();
    if (sock)
    {
        sock->TraceConnectWithoutContext("CongestionWindow", MakeBoundCallback(&CwndTracer, g_cwndStream));
    }
}

int main(int argc, char *argv[])
{
    std::string tcpVariant = "ns3::TcpNewReno";
    std::string bandwidth = "1Mbps";
    std::string delay = "10ms";
    uint32_t queueSize = 20;
    double duration = 20.0;
    std::string outputDir = ".";
    std::string label = "newreno";

    CommandLine cmd;
    cmd.AddValue("tcpVariant", "TCP variant type id", tcpVariant);
    cmd.AddValue("bandwidth", "Bottleneck bandwidth", bandwidth);
    cmd.AddValue("delay", "Bottleneck delay", delay);
    cmd.AddValue("queueSize", "Queue size (packets)", queueSize);
    cmd.AddValue("duration", "Simulation duration", duration);
    cmd.AddValue("outputDir", "Output directory", outputDir);
    cmd.AddValue("label", "Output file prefix", label);
    cmd.Parse(argc, argv);

    //set TCP variant
    Config::SetDefault("ns3::TcpL4Protocol::SocketType", TypeIdValue(TypeId::LookupByName(tcpVariant)));
    Config::SetDefault("ns3::TcpSocket::SegmentSize", UintegerValue(1024));
    Config::SetDefault("ns3::TcpSocket::SndBufSize", UintegerValue(131072));
    Config::SetDefault("ns3::TcpSocket::RcvBufSize", UintegerValue(131072));

    //topology: n0(sender)--n1(r1)--n2(r2)--n3(receiver)
    NodeContainer nodes;
    nodes.Create(4);

    PointToPointHelper accessLink;
    accessLink.SetDeviceAttribute("DataRate", StringValue("10Mbps"));
    accessLink.SetChannelAttribute("Delay", StringValue("2ms"));

    PointToPointHelper bottleneck;
    bottleneck.SetDeviceAttribute("DataRate", StringValue(bandwidth));
    bottleneck.SetChannelAttribute("Delay", StringValue(delay));
    bottleneck.SetQueue("ns3::DropTailQueue", "MaxSize", StringValue(std::to_string(queueSize) + "p"));

    NetDeviceContainer dev01 = accessLink.Install(nodes.Get(0), nodes.Get(1));
    NetDeviceContainer dev12 = bottleneck.Install(nodes.Get(1), nodes.Get(2));
    NetDeviceContainer dev23 = accessLink.Install(nodes.Get(2), nodes.Get(3));

    InternetStackHelper stack;
    stack.InstallAll();

    Ipv4AddressHelper address;
    address.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer if01 = address.Assign(dev01);

    address.SetBase("10.1.2.0", "255.255.255.0");
    address.Assign(dev12);

    address.SetBase("10.1.3.0", "255.255.255.0");
    Ipv4InterfaceContainer if23 = address.Assign(dev23);

    Ipv4GlobalRoutingHelper::PopulateRoutingTables();

    uint16_t port = 9;

    //sink on receiver
    PacketSinkHelper sinkHelper("ns3::TcpSocketFactory", InetSocketAddress(Ipv4Address::GetAny(), port));
    ApplicationContainer sinkApp = sinkHelper.Install(nodes.Get(3));
    sinkApp.Start(Seconds(0.0));
    sinkApp.Stop(Seconds(duration));

    //BulkSend on sender
    BulkSendHelper sourceHelper("ns3::TcpSocketFactory", InetSocketAddress(if23.GetAddress(1), port));
    sourceHelper.SetAttribute("MaxBytes", UintegerValue(0));
    sourceHelper.SetAttribute("SendSize", UintegerValue(1024));
    // ApplicationContainer sourceApp = sourceHelper.Install(nodes.Get(0));
    g_sourceApp = sourceHelper.Install(nodes.Get(0));    
    g_sourceApp.Start(Seconds(1.0));
    g_sourceApp.Stop(Seconds(duration - 1.0));

    //cwnd trace
    std::string cwndPath = outputDir + "/" + label + "-cwnd.csv";
    AsciiTraceHelper ascii;
    g_cwndStream = ascii.CreateFileStream(cwndPath);
    *g_cwndStream->GetStream() << "time,cwnd\n";
    Simulator::Schedule(Seconds(1.1), &ConnectCwndTrace);

    //FlowMonitor
    FlowMonitorHelper flowmon;
    Ptr<FlowMonitor> monitor = flowmon.InstallAll();

    Simulator::Stop(Seconds(duration));
    Simulator::Run();

    //save FlowMonitor XML
    std::string xmlPath = outputDir + "/" + label + "-flowmon.xml";
    monitor->SerializeToXmlFile(xmlPath, true, true);

    //save results CSV
    monitor->CheckForLostPackets();
    Ptr<Ipv4FlowClassifier> classifier = DynamicCast<Ipv4FlowClassifier>(flowmon.GetClassifier());
    std::map<FlowId, FlowMonitor::FlowStats> stats = monitor->GetFlowStats();

    std::string csvPath = outputDir + "/" + label + "-results.csv";
    std::ofstream out(csvPath.c_str());
    out << "flowId,src,dst,txPackets,rxPackets,lostPackets,throughputMbps,meanDelayMs\n";

    for (auto &i : stats)
    {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(i.first);
        double dur = i.second.timeLastRxPacket.GetSeconds() - i.second.timeFirstTxPacket.GetSeconds();
        double tput = (dur > 0) ? i.second.rxBytes * 8.0 / dur / 1e6 : 0;
        double delay_ms = (i.second.rxPackets > 0)
                        ? i.second.delaySum.GetSeconds() * 1000.0 / i.second.rxPackets
                        : 0;
        out << i.first << ","
            << t.sourceAddress << ","
            << t.destinationAddress << ","
            << i.second.txPackets << ","
            << i.second.rxPackets << ","
            << i.second.lostPackets << ","
            << tput << ","
            << delay_ms << "\n";
    }
    out.close();

    std::cout << "[DONE] " << tcpVariant
              << " | cwnd: " << cwndPath
              << " | results: " << csvPath << std::endl;

    Simulator::Destroy();
    return 0;
}
