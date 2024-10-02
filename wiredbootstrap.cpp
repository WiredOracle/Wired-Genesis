#include <iostream>
#include <vector>
#include <memory>
#include <QCoreApplication>
#include <QTcpSocket>
#include <libp2p/Host.hpp> // P2P ARCHITECTURE
#include <libp2p/Network.hpp> // P2P ARCHITECTURE
#include <sodium.h> // LIBSODIUM - ENCRYPTION
#include <ipfs/api.hpp> // IPFS - FILE SHARING
#include <sqlite3.h> // SQLITE - DATABASE
#include <std.h> // STANDARD - SYNTAX

using namespace libp2p;

void createNode(std::shared_ptr<Host>& host) {
    // Create a context for libp2p
    auto context = std::make_shared<network::Network>();

    // Create a host
    host = std::make_shared<Host>(context);

    // Start the host
    host->start();

    // Print the peer ID
    std::cout << "Node ID: " << host->getPeerId().toString() << std::endl;
}

void bootstrapPeers(std::shared_ptr<Host> host) {
    // List of known peers (example IDs)
    std::vector<std::string> knownPeers = {
        "/ip4/127.0.0.1/tcp/4001/p2p/QmExamplePeerId1",
        "/ip4/127.0.0.1/tcp/4002/p2p/QmExamplePeerId2"
    };

    for (const auto& peerId : knownPeers) {
        peer::PeerInfo peer(peerId);
        // Connect to each peer
        if (host->connect(peer)) {
            std::cout << "Connected to peer: " << peerId << std::endl;
        } else {
            std::cout << "Failed to connect to peer: " << peerId << std::endl;
        }
    }
}

void sendMessage(std::shared_ptr<Host> host, const std::string& message) {
    auto peers = host->getConnectedPeers();
    for (const auto& peer : peers) {
        // Send a message to each connected peer
        // This is a placeholder for actual message sending logic
        // Depending on your libp2p setup, use the appropriate send method
        // e.g., host->send(peer, message);
        std::cout << "Sending message to peer: " << peer.toString() << " - Message: " << message << std::endl;
    }
}

int main() {
    std::shared_ptr<Host> host;

    createNode(host);
    bootstrapPeers(host);

    // Example of sending a message
    std::string message = "Hello, peers! No matter where you go, we are all connected.";
    sendMessage(host, message);

    return 0;
}