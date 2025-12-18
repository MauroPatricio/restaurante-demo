import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        try {
            const localData = localStorage.getItem('client-cart');
            return localData ? JSON.parse(localData) : [];
        } catch {
            return [];
        }
    });

    const [restaurantId, setRestaurantId] = useState(() => {
        return localStorage.getItem('client-restaurant-id') || null;
    });

    useEffect(() => {
        localStorage.setItem('client-cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (restaurantId) {
            localStorage.setItem('client-restaurant-id', restaurantId);
        }
    }, [restaurantId]);

    const addToCart = (item, qty = 1, customizations = []) => {
        setCart(prev => {
            // Check if item with same ID and customizations exists
            const existingIndex = prev.findIndex(i =>
                i._id === item._id &&
                JSON.stringify(i.customizations) === JSON.stringify(customizations)
            );

            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex].qty += qty;
                return newCart;
            }

            return [...prev, { ...item, qty, customizations }];
        });
    };

    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQty = (index, delta) => {
        setCart(prev => {
            return prev.map((item, i) => {
                if (i === index) {
                    const newQty = item.qty + delta;
                    if (newQty < 1) return null; // Logic handled by remove usually, but here prevent < 1
                    return { ...item, qty: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartTotal = cart.reduce((total, item) => {
        const itemTotal = (item.price + (item.customizations?.reduce((acc, c) => acc + (c.priceModifier || 0), 0) || 0)) * item.qty;
        return total + itemTotal;
    }, 0);

    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    const checkRestaurant = (currentId) => {
        if (restaurantId && restaurantId !== currentId && cart.length > 0) {
            // Logic to warn user that cart will be cleared if switching restaurant
            // For now, auto-clear or keep separate logic logic
            if (confirm("You are switching restaurants. Clear current cart?")) {
                clearCart();
                setRestaurantId(currentId);
            }
        } else {
            setRestaurantId(currentId);
        }
    };

    const value = {
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartTotal,
        cartCount,
        checkRestaurant
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
