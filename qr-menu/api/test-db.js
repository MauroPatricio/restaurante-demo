import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import net from 'net';
import { promisify } from 'util';
import fetch from 'node-fetch';

dotenv.config();

const lookup = promisify(dns.lookup);
const KNOWN_MONGO_IP = '165.90.78.252'; // One of the IPs for cluster0.y7vbtxw.mongodb.net

console.log("\n============================================");
console.log("      DIAGNOSTIC MODE: DNS vs FIREWALL");
console.log("============================================");

async function checkPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000); // 3 sec timeout

        socket.on('connect', () => {
            socket.destroy();
            resolve(true); // Connected!
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false); // Timeout
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve(false); // Error
        });

        socket.connect(port, host);
    });
}

async function run() {
    try {
        console.log("1. Checking Client IP...");
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            console.log(`   -> YOUR IP: ${data.ip}`);
        } catch (e) { console.log("   -> Unknown IP"); }

        console.log("\n2. Testing DNS Resolution (cluster0.y7vbtxw.mongodb.net)...");
        let resolvedIp = null;
        try {
            const result = await lookup('cluster0.y7vbtxw.mongodb.net');
            console.log(`   -> ✅ DNS SUCCESS: Resolved to ${result.address}`);
            resolvedIp = result.address;
        } catch (e) {
            console.log(`   -> ❌ DNS FAILED: ${e.code}`);
        }

        console.log(`\n3. Testing TCP PORT 27017 (Using raw IP ${KNOWN_MONGO_IP})...`);
        const canConnect = await checkPort(KNOWN_MONGO_IP, 27017);
        if (canConnect) {
            console.log("   -> ✅ TCP SUCCESS: We CAN reach the server!");
            console.log("      CONCLUSION: This is purely a DNS issue.");
            console.log("      FIX: Change your computer's DNS to 8.8.8.8");
        } else {
            console.log("   -> ❌ TCP FAILED: Connection timed out or refused.");
            console.log("      CONCLUSION: Your application is BLOCKED by a FIREWALL.");
            console.log("      FIX: You MUST use a VPN or Mobile Data.");
        }

        process.exit(canConnect ? 0 : 1);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
