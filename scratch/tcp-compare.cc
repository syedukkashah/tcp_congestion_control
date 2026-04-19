#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/point-to-point-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-helper.h"
#include "ns3/ipv4-flow-classifier.h"
#include "ns3/tcp-tahoe.h"
#include "ns3/tcp-reno.h"

#include <fstream>
#include <iostream>
#include <map>
#include <string>

using namespace ns3;

static Ptr<OutputStreamWrapper> g_cwndStream;

static void
CwndTracer(Ptr<OutputStreamWrapper> stream, uint32_t oldCwnd, uint32_t newCwnd)
{
    *stream->GetStream() << Simulator::Now().GetSeconds() << "," << newCwnd << std::endl;
}

int
main(int argc, char* argv[])
{
    std::string tcpVariant = "TcpTahoe";
    std::string resultsFile = "results-tahoe.csv";
    std::string cwndFile = "cwnd-tahoe.csv";

    CommandLine cmd;
    cmd.AddValue("tcpVariant", "TcpTahoe or TcpReno", tcpVariant);
    cmd.AddValue("resultsFile", "CSV output file", resultsFile);
    cmd.AddValue("cwndFile", "CWND output file", cwndFile);
    cmd.Parse(argc, argv);

    if (tcpVariant == "TcpTahoe")
    {
        Config::SetDefault("ns3::TcpL4Protocol::SocketType",
                           TypeIdValue(TcpTahoe::GetTypeId()));
    }
    else if (tcpVariant == "TcpReno")
    {
        Config::SetDefault("ns3::TcpL4Protocol::SocketType",
                           TypeIdValue(TcpReno::GetTypeId()));
    }
    else
    {
        std::cerr << "Use TcpTahoe or TcpReno" << std::endl;
        return 1;
    }

    Config::SetDefault("ns3::DropTailQueue::MaxPackets", UintegerValue(20));

    NodeContainer nodes;
    nodes.Create(4);

    Ptr<Node> sender = nodes.Get(0);
    Ptr<Node> router1 = nodes.Get(1);
    Ptr<Node> router2 = nodes.Get(2);
    Ptr<Node> receiver = nodes.Get(3);

    PointToPointHelper fastLink;
    fastLink.SetDeviceAttribute("DataRate", StringValue("10Mbps"));
    fastLink.SetChannelAttribute("Delay", StringValue("2ms"));

    PointToPointHelper bottleneckLink;
    bottleneckLink.SetDeviceAttribute("DataRate", StringValue("1Mbps"));
    bottleneckLink.SetChannelAttribute("Delay", StringValue("20ms"));

    NetDeviceContainer dev01 = fastLink.Install(sender, router1);
    NetDeviceContainer dev12 = bottleneckLink.Install(router1, router2);
    NetDeviceContainer dev23 = fastLink.Install(router2, receiver);

    InternetStackHelper stack;
    stack.Install(nodes);

    Ipv4AddressHelper address;
    address.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer if01 = address.Assign(dev01);

    address.SetBase("10.1.2.0", "255.255.255.0");
    Ipv4InterfaceContainer if12 = address.Assign(dev12);

    address.SetBase("10.1.3.0", "255.255.255.0");
    Ipv4InterfaceContainer if23 = address.Assign(dev23);

    Ipv4GlobalRoutingHelper::PopulateRoutingTables();

    uint16_t sinkPort = 8080;
    Address sinkAddress(InetSocketAddress(if23.GetAddress(1), sinkPort));

    PacketSinkHelper sinkHelper("ns3::TcpSocketFactory",
                                InetSocketAddress(Ipv4Address::GetAny(), sinkPort));
    ApplicationContainer sinkApps = sinkHelper.Install(receiver);
    sinkApps.Start(Seconds(0.0));
    sinkApps.Stop(Seconds(20.0));

    BulkSendHelper sourceHelper("ns3::TcpSocketFactory", sinkAddress);
    sourceHelper.SetAttribute("MaxBytes", UintegerValue(0));
    ApplicationContainer sourceApps = sourceHelper.Install(sender);
    sourceApps.Start(Seconds(1.0));
    sourceApps.Stop(Seconds(20.0));

    AsciiTraceHelper ascii;
    g_cwndStream = ascii.CreateFileStream(cwndFile);
    *g_cwndStream->GetStream() << "time,cwnd_bytes" << std::endl;

    Config::ConnectWithoutContext(
        "/NodeList/0/$ns3::TcpL4Protocol/SocketList/0/CongestionWindow",
        MakeBoundCallback(&CwndTracer, g_cwndStream));

    FlowMonitorHelper flowmon;
    Ptr<FlowMonitor> monitor = flowmon.InstallAll();

    fastLink.EnablePcapAll("tcp-left");
    bottleneckLink.EnablePcapAll("tcp-bottleneck");
    fastLink.EnablePcapAll("tcp-right");

    Simulator::Stop(Seconds(20.0));
    Simulator::Run();

    monitor->CheckForLostPackets();

    Ptr<Ipv4FlowClassifier> classifier =
        DynamicCast<Ipv4FlowClassifier>(flowmon.GetClassifier());
    std::map<FlowId, FlowMonitor::FlowStats> stats = monitor->GetFlowStats();

    std::ofstream out(resultsFile.c_str());
    out << "flowId,src,dst,txPackets,rxPackets,lostPackets,throughputMbps,meanDelayMs\n";

    for (std::map<FlowId, FlowMonitor::FlowStats>::const_iterator i = stats.begin();
         i != stats.end(); ++i)
    {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(i->first);

        double duration =
            i->second.timeLastRxPacket.GetSeconds() - i->second.timeFirstTxPacket.GetSeconds();

        double throughputMbps = 0.0;
        if (duration > 0)
        {
            throughputMbps = i->second.rxBytes * 8.0 / duration / 1000000.0;
        }

        double meanDelayMs = 0.0;
        if (i->second.rxPackets > 0)
        {
            meanDelayMs = i->second.delaySum.GetSeconds() * 1000.0 / i->second.rxPackets;
        }

        out << i->first << ","
            << t.sourceAddress << ","
            << t.destinationAddress << ","
            << i->second.txPackets << ","
            << i->second.rxPackets << ","
            << i->second.lostPackets << ","
            << throughputMbps << ","
            << meanDelayMs << "\n";
    }

    Ptr<PacketSink> sink = DynamicCast<PacketSink>(sinkApps.Get(0));
    std::cout << tcpVariant << " total bytes received: " << sink->GetTotalRx() << std::endl;
    std::cout << "Saved flow metrics to " << resultsFile << std::endl;
    std::cout << "Saved cwnd trace to " << cwndFile << std::endl;

    out.close();
    Simulator::Destroy();
    return 0;
}
