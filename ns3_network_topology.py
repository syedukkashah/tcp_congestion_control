# Optimal Network Topology for TCP Tahoe and Reno Simulation
# This script sets up a simple network topology with sender, receiver, and routers using ns-3 Python bindings.

import ns.applications
import ns.core
import ns.internet
import ns.network
import ns.point_to_point

# Enable logging
ns.core.LogComponentEnable("UdpEchoClientApplication", ns.core.LOG_LEVEL_INFO)
ns.core.LogComponentEnable("UdpEchoServerApplication", ns.core.LOG_LEVEL_INFO)

# Create nodes
nodes = ns.network.NodeContainer()
nodes.Create(4)  # Sender, Receiver, and 2 Routers

# Create point-to-point links
pointToPoint = ns.point_to_point.PointToPointHelper()
pointToPoint.SetDeviceAttribute("DataRate", ns.core.StringValue("10Mbps"))
pointToPoint.SetChannelAttribute("Delay", ns.core.StringValue("2ms"))

# Install links between nodes
devices1 = pointToPoint.Install(nodes.Get(0), nodes.Get(2))  # Sender to Router 1
devices2 = pointToPoint.Install(nodes.Get(2), nodes.Get(3))  # Router 1 to Router 2
devices3 = pointToPoint.Install(nodes.Get(3), nodes.Get(1))  # Router 2 to Receiver

# Install Internet stack
stack = ns.internet.InternetStackHelper()
stack.Install(nodes)

# Assign IP addresses
address = ns.internet.Ipv4AddressHelper()
address.SetBase(ns.network.Ipv4Address("10.1.1.0"), ns.network.Ipv4Mask("255.255.255.0"))
interfaces1 = address.Assign(devices1)
interfaces2 = address.Assign(devices2)
interfaces3 = address.Assign(devices3)

# Set up applications
# Server
echoServer = ns.applications.UdpEchoServerHelper(9)
serverApps = echoServer.Install(nodes.Get(1))  # Receiver
serverApps.Start(ns.core.Seconds(1.0))
serverApps.Stop(ns.core.Seconds(10.0))

# Client
echoClient = ns.applications.UdpEchoClientHelper(interfaces3.GetAddress(1), 9)
echoClient.SetAttribute("MaxPackets", ns.core.UintegerValue(1))
echoClient.SetAttribute("Interval", ns.core.TimeValue(ns.core.Seconds(1.0)))
echoClient.SetAttribute("PacketSize", ns.core.UintegerValue(1024))

clientApps = echoClient.Install(nodes.Get(0))  # Sender
clientApps.Start(ns.core.Seconds(2.0))
clientApps.Stop(ns.core.Seconds(10.0))

# Add TCP Tahoe configuration
# Configure TCP Tahoe as the congestion control algorithm
ns.core.Config.Set("ns3::TcpL4Protocol::SocketType", ns.core.StringValue("ns3::TcpTahoe"))

# Add traffic generation for TCP Tahoe
# Create a BulkSendApplication to send data
bulkSender = ns.applications.BulkSendHelper("ns3::TcpSocketFactory", ns.network.InetSocketAddress(interfaces3.GetAddress(1), 8080))
bulkSender.SetAttribute("MaxBytes", ns.core.UintegerValue(0))  # Unlimited data

# Install the BulkSendApplication on the sender node
senderApp = bulkSender.Install(nodes.Get(0))
senderApp.Start(ns.core.Seconds(2.0))
senderApp.Stop(ns.core.Seconds(10.0))

# Create a PacketSinkApplication to receive data
packetSink = ns.applications.PacketSinkHelper("ns3::TcpSocketFactory", ns.network.InetSocketAddress(ns.network.Ipv4Address.GetAny(), 8080))

# Install the PacketSinkApplication on the receiver node
receiverApp = packetSink.Install(nodes.Get(1))
receiverApp.Start(ns.core.Seconds(1.0))
receiverApp.Stop(ns.core.Seconds(10.0))

# Add TCP Reno configuration
# Configure TCP Reno as the congestion control algorithm
ns.core.Config.Set("ns3::TcpL4Protocol::SocketType", ns.core.StringValue("ns3::TcpReno"))

# Add traffic generation for TCP Reno
# Create a BulkSendApplication to send data
bulkSenderReno = ns.applications.BulkSendHelper("ns3::TcpSocketFactory", ns.network.InetSocketAddress(interfaces3.GetAddress(1), 8081))
bulkSenderReno.SetAttribute("MaxBytes", ns.core.UintegerValue(0))  # Unlimited data

# Install the BulkSendApplication on the sender node
senderAppReno = bulkSenderReno.Install(nodes.Get(0))
senderAppReno.Start(ns.core.Seconds(12.0))
senderAppReno.Stop(ns.core.Seconds(20.0))

# Create a PacketSinkApplication to receive data
packetSinkReno = ns.applications.PacketSinkHelper("ns3::TcpSocketFactory", ns.network.InetSocketAddress(ns.network.Ipv4Address.GetAny(), 8081))

# Install the PacketSinkApplication on the receiver node
receiverAppReno = packetSinkReno.Install(nodes.Get(1))
receiverAppReno.Start(ns.core.Seconds(11.0))
receiverAppReno.Stop(ns.core.Seconds(20.0))

# Enable routing
ns.internet.Ipv4GlobalRoutingHelper.PopulateRoutingTables()

# Run simulation
ns.core.Simulator.Run()
ns.core.Simulator.Destroy()