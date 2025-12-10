import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [restaurantId, setRestaurantId] = useState(null);
    const [tableId, setTableId] = useState(null);
    const [orderType, setOrderType] = useState('dine-in'); // dine-in, takeaway, delivery
    const [deliveryAddress, setDeliveryAddress] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);

    // Load cart from storage on mount
    useEffect(() => {
        loadCart();
    }, []);

    // Save cart to storage whenever it changes
    useEffect(() => {
        saveCart();
    }, [items, restaurantId, tableId, orderType, deliveryAddress, couponCode, discount]);

    const loadCart = async () => {
        try {
            const savedCart = await AsyncStorage.getItem('@cart');
            if (savedCart) {
                const cart = JSON.parse(savedCart);
                setItems(cart.items || []);
                setRestaurantId(cart.restaurantId);
                setTableId(cart.tableId);
                setOrderType(cart.orderType || 'dine-in');
                setDeliveryAddress(cart.deliveryAddress);
                setCouponCode(cart.couponCode || '');
                setDiscount(cart.discount || 0);
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
        }
    };

    const saveCart = async () => {
        try {
            const cart = {
                items,
                restaurantId,
                tableId,
                orderType,
                deliveryAddress,
                couponCode,
                discount,
            };
            await AsyncStorage.setItem('@cart', JSON.stringify(cart));
        } catch (error) {
            console.error('Failed to save cart:', error);
        }
    };

    const addItem = (menuItem, quantity = 1, customizations = []) => {
        const existingItemIndex = items.findIndex(
            (item) =>
                item.menuItem._id === menuItem._id &&
                JSON.stringify(item.customizations) === JSON.stringify(customizations)
        );

        if (existingItemIndex >= 0) {
            // Update quantity if item with same customizations exists
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            setItems(updatedItems);
        } else {
            // Add new item
            setItems([
                ...items,
                {
                    menuItem,
                    quantity,
                    customizations,
                    subtotal: menuItem.price * quantity,
                },
            ]);
        }
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateQuantity = (index, quantity) => {
        if (quantity <= 0) {
            removeItem(index);
            return;
        }

        const updatedItems = [...items];
        updatedItems[index].quantity = quantity;
        updatedItems[index].subtotal = updatedItems[index].menuItem.price * quantity;
        setItems(updatedItems);
    };

    const clearCart = () => {
        setItems([]);
        setCouponCode('');
        setDiscount(0);
        setDeliveryAddress(null);
    };

    const setContext = (restaurant, table) => {
        setRestaurantId(restaurant);
        setTableId(table);
    };

    const applyCoupon = (code, discountAmount) => {
        setCouponCode(code);
        setDiscount(discountAmount);
    };

    const removeCoupon = () => {
        setCouponCode('');
        setDiscount(0);
    };

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.16; // 16% tax (adjustable)
    const serviceCharge = subtotal * 0.05; // 5% service charge (adjustable)
    const deliveryFee = orderType === 'delivery' ? 50 : 0; // 50 MT delivery fee
    const total = subtotal + tax + serviceCharge + deliveryFee - discount;

    const value = {
        items,
        restaurantId,
        tableId,
        orderType,
        deliveryAddress,
        couponCode,
        discount,
        subtotal,
        tax,
        serviceCharge,
        deliveryFee,
        total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setContext,
        setOrderType,
        setDeliveryAddress,
        applyCoupon,
        removeCoupon,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
