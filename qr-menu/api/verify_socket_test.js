import { io } from "socket.io-client";
import fetch from "node-fetch";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

// Use existing restaurant data
const EXISTING_EMAIL = "owner@kfc.com"; // From your existing data
const EXISTING_PASSWORD = "senha123"; // Adjust if different
const EXISTING_RESTAURANT_ID = "695fe59bd9193b05e3c59209"; // KFC restaurant ID

async function run() {
    console.log("1. Logging in as existing owner...");

    try {
        // Login with existing user
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: EXISTING_EMAIL,
                password: EXISTING_PASSWORD
            })
        });

        if (!loginRes.ok) {
            console.error("Login failed", await loginRes.text());
            process.exit(1);
        }
        const loginData = await loginRes.json();
        const token = loginData.token;
        const restaurantId = EXISTING_RESTAURANT_ID;
        console.log("   Logged in successfully.");

        // Connect Socket
        console.log("2. Connecting Socket...");
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        let receivedNewOrder = false;

        socket.on("connect", () => {
            console.log("   Socket connected:", socket.id);
            socket.emit("join:restaurant", { restaurantId });
        });

        socket.on("order:new", (data) => {
            console.log("✅ SUCCESS: Received 'order:new' event!");
            console.log("   Order ID:", data._id || data.order?._id);
            receivedNewOrder = true;
            socket.disconnect();
            process.exit(0);
        });

        // Wait for connection before creating order
        setTimeout(async () => {
            console.log("3. Creating test order...");

            // Get existing tables
            const tablesRes = await fetch(`${API_URL}/tables/restaurant/${restaurantId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const tablesData = await tablesRes.json();
            const tableId = tablesData.tables?.[0]?._id;

            if (!tableId) {
                console.error("No tables found for restaurant");
                process.exit(1);
            }

            // Get existing menu items
            const itemsRes = await fetch(`${API_URL}/menu-items/restaurant/${restaurantId}`);
            const itemsData = await itemsRes.json();
            const itemId = itemsData.items?.[0]?._id;

            if (!itemId) {
                console.error("No menu items found for restaurant");
                process.exit(1);
            }

            console.log(`   Using table ${tableId} and item ${itemId}`);

            // Create Order
            const orderRes = await fetch(`${API_URL}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurant: restaurantId,
                    table: tableId,
                    items: [{ item: itemId, qty: 1, notes: "Test order from socket verification" }],
                    orderType: "dine-in"
                })
            });

            if (!orderRes.ok) {
                console.error("Order creation failed", await orderRes.text());
                process.exit(1);
            } else {
                const orderData = await orderRes.json();
                console.log("   Order created successfully:", orderData.order?._id);
            }

        }, 2000);

        // Timeout
        setTimeout(() => {
            if (!receivedNewOrder) {
                console.error("❌ FAILED: Timeout waiting for order:new event.");
                console.error("   The order was created but the socket event was not received.");
                process.exit(1);
            }
        }, 10000);
    } catch (err) {
        console.error("Script error:", err);
        process.exit(1);
    }
}

run();
