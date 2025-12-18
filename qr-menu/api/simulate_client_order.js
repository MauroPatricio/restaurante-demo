import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';
const REST_ID = '6943ccaf286ac557e7139843';
const TABLE_ID = '6943ccb1286ac557e713985c';

async function testOrder() {
    try {
        console.log('🍔 Simulando Pedido do Cliente...');

        // 1. Get Menu Item ID first
        const menuRes = await fetch(`${API_URL}/menu/${REST_ID}`);
        const menuData = await menuRes.json();
        const burger = menuData.items.find(i => i.name.includes('Burger'));

        if (!burger) throw new Error('Burger not found in menu');
        console.log('✓ Found Item:', burger.name);

        // 2. Place Order
        const orderPayload = {
            restaurant: REST_ID,
            table: TABLE_ID,
            items: [{
                item: burger._id,
                qty: 1,
                itemPrice: burger.price
            }],
            total: burger.price,
            customerName: 'Script Verifier',
            phone: '841112222',
            paymentMethod: 'cash',
            orderType: 'dine-in'
        };

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (res.status === 201) {
            const data = await res.json();
            console.log('✅ PEDIDO CRIADO COM SUCESSO!');
            console.log(`🆔 ID: ${data.order.id}`);
            console.log(`💰 Total: ${data.order.total}`);
            console.log(`👤 Cliente: Script Verifier`);
        } else {
            console.error('❌ Falha ao criar pedido:', await res.text());
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testOrder();
