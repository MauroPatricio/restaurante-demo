import fetch from 'node-fetch';

const run = async () => {
    try {
        const timestamp = Date.now();
        const email = `verifier${timestamp}@test.com`;
        const password = 'password123';

        // 1. Register
        const regRes = await fetch('http://localhost:4001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: 'Verifier', 
                email, 
                password, 
                phone: '123456789',
                restaurantName: 'Verification Bistro 2',
                restaurantAddress: '123 Test St'
            })
        });
        const regData = await regRes.json();
        const token = regData.token;

        if (!token) {
            console.log("REGISTER_FAILED", JSON.stringify(regData));
            return;
        }

        // 2. Create Restaurant
        const restRes = await fetch('http://localhost:4001/api/restaurants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Verification Bistro',
                address: '123 Test St',
                phone: '123456789',
                email: 'bistro@test.com'
            })
        });
        const restData = await restRes.json();

        if (restData.restaurant) {
            const restId = restData.restaurant._id || restData.restaurant.id;
            console.log("RESTAURANT_ID:", restId);

            // 3. Create Category
            // API might not have direct category creation if it's derived, but let's see. 
            // Actually, MenuItem has `category` string field. 
            // Looking at models, Category might be separate or just string.
            // If it's string, just create item.

            // 4. Create Menu Item
            const itemRes = await fetch('http://localhost:4001/api/menu-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    restaurant: restId,
                    name: 'Test Burger',
                    description: 'Delicious verification burger',
                    price: 150,
                    category: 'Starters',
                    available: true,
                    image: 'https://via.placeholder.com/150'
                })
            });
            const itemData = await itemRes.json();
            console.log("ITEM_CREATED:", itemData._id || "FAIL");

        } else {
            console.log("CREATE_RESTAURANT_FAILED", JSON.stringify(restData));
        }

    } catch (e) {
        console.error(e);
    }
};

run();
