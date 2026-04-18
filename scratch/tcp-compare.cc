#include "ns3/applications-module.h"
#include "ns3/core-module.h"
#include "ns3/flow-monitor-helper.h"
#include "ns3/internet-module.h"
#include "ns3/ipv4-flow-classifier.h"
#include "ns3/network-module.h"
#include "ns3/point-to-point-module.h"

#include <fstream>
#include <iostream>
#include <string>

using namespace ns3;

int
main(int argc, char* argv[])
{
    std::string tcpVariant = "TcpNewReno";
    std::string csvFile = "newreno-results.csv";
    bool enablePcap = true;

    CommandLine cmd(__FILE__);
    cmd.AddValue("tcpVariant", "TcpNewReno or TcpLinuxReno", tcpVariant);
    cmd.AddValue("csvFile", "CSV file for flow metrics", csvFile);
    cmd.AddValue("enablePcap", "Enable pcap tracing", enablePcap);
    cmd.Parse(argc, argv);

    TypeId tcpTid;
    if (tcpVariant == "TcpNewReno")
    {
        tcpTid = TypeId::LookupByName("ns3::TcpNewReno");
    }
    else if (tcpVariant == "TcpLinuxReno")
    {
        tcpTid = TypeId::LookupByName("ns3::TcpLinuxReno");
    }
    else
    {
        std::cerr << "Invalid tcpVariant. Use TcpNewReno or TcpLinuxReno." << std::endl;
        return 1;
    }

    Config::SetDefault("ns3::TcpL4Protocol::SocketType", TypeIdValue(tcpTid));
    Config::SetDefault("ns3::DropTailQueue<Packet>::MaxSize", StringValue("20p"));

    std::cout << "Running simulation with " << tcpVariant << "..." << std::endl;

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
    ApplicationContainer sinkApp = sinkHelper.Install(receiver);
    sinkApp.Start(Seconds(0.0));
    sinkApp.Stop(Seconds(20.0));

    BulkSendHelper sourceHelper("ns3::TcpSocketFactory", sinkAddress);
    sourceHelper.SetAttribute("MaxBytes", UintegerValue(0));
    sourceHelper.SetAttribute("SendSize", UintegerValue(1024));
    ApplicationContainer sourceApp = sourceHelper.Install(sender);
    sourceApp.Start(Seconds(1.0));
    sourceApp.Stop(Seconds(20.0));

    FlowMonitorHelper flowHelper;
    Ptr<FlowMonitor> monitor = flowHelper.InstallAll();

    if (enablePcap)
    {
        fastLink.EnablePcapAll("tcp-left");
        bottleneckLink.EnablePcapAll("tcp-bottleneck");
        fastLink.EnablePcapAll("tcp-right");
    }

    Simulator::Stop(Seconds(20.0));
    Simulator::Run();

    monitor->CheckForLostPackets();

    Ptr<Ipv4FlowClassifier> classifier =
        DynamicCast<Ipv4FlowClassifier>(flowHelper.GetClassifier());
    FlowMonitor::FlowStatsContainer stats = monitor->GetFlowStats();

    std::ofstream results(csvFile.c_str(), std::ios::out);
    if (!results.is_open())
    {
        std::cerr << "Could not open results file: " << csvFile << std::endl;
        Simulator::Destroy();
        return 1;
    }

    results << "flowId,src,dst,txPackets,rxPackets,lostPackets,throughputMbps,meanDelayMs"
            << std::endl;

    for (const auto& flow : stats)
    {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(flow.first);

        double throughputMbps = 0.0;
        double duration =
            flow.second.timeLastRxPacket.GetSeconds() - flow.second.timeFirstTxPacket.GetSeconds();

        if (duration > 0.0)
        {
            throughputMbps = (flow.second.rxBytes * 8.0) / duration / 1000000.0;
        }

        double meanDelayMs = 0.0;
        if (flow.second.rxPackets > 0)
        {
            meanDelayMs =
                (flow.second.delaySum.GetSeconds() * 1000.0) /
                static_cast<double>(flow.second.rxPackets);
        }

        results << flow.first << ","
                << t.sourceAddress << ","
                << t.destinationAddress << ","
                << flow.second.txPackets << ","
                << flow.second.rxPackets << ","
                << flow.second.lostPackets << ","
                << throughputMbps << ","
                << meanDelayMs << std::endl;
    }

    Ptr<PacketSink> sink = DynamicCast<PacketSink>(sinkApp.Get(0));
    std::cout << tcpVariant << " total bytes received: " << sink->GetTotalRx() << std::endl;
    std::cout << "Saved flow metrics to " << csvFile << std::endl;

    results.close();
    Simulator::Destroy();
    return 0;
}