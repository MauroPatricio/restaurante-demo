import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Alert
} from 'react-native';
import { useCart } from '../contexts/CartContext';

export default function CartScreen({ navigation }) {
    const {
        items,
        subtotal,
        tax,
        serviceCharge,
        deliveryFee,
        discount,
        total,
        itemCount,
        couponCode,
        removeItem,
        updateQuantity,
        applyCoupon,
        removeCoupon,
        clearCart,
    } = useCart();

    const [couponInput, setCouponInput] = React.useState('');

    const handleApplyCoupon = () => {
        // TODO: Validate coupon with API
        if (couponInput.trim()) {
            const mockDiscount = 50; // Mock 50 MT discount
            applyCoupon(couponInput.toUpperCase(), mockDiscount);
            Alert.alert('Success', `Coupon "${couponInput}" applied! Discount: ${mockDiscount} MT`);
            setCouponInput('');
        }
    };

    const handleCheckout = () => {
        if (items.length === 0) {
            Alert.alert('Empty Cart', 'Please add items to your cart first');
            return;
        }
        navigation.navigate('Checkout');
    };

    const renderCartItem = ({ item, index }) => (
        <View style={styles.cartItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                {item.customizations && item.customizations.length > 0 && (
                    <Text style={styles.itemCustomizations}>
                        {item.customizations.map(c => c.name).join(', ')}
                    </Text>
                )}
                <Text style={styles.itemPrice}>{item.menuItem.price} MT</Text>
            </View>

            <View style={styles.quantityControls}>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(index, item.quantity - 1)}
                >
                    <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.quantity}>{item.quantity}</Text>

                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(index, item.quantity + 1)}
                >
                    <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.itemRight}>
                <Text style={styles.itemSubtotal}>{item.subtotal} MT</Text>
                <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.removeButton}
                >
                    <Text style={styles.removeButtonText}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🛒</Text>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyText}>Add items from the menu to get started</Text>
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.browseButtonText}>Browse Menu</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Cart ({itemCount} items)</Text>
                <TouchableOpacity onPress={() => {
                    Alert.alert('Clear Cart', 'Remove all items?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear', onPress: clearCart, style: 'destructive' }
                    ]);
                }}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                renderItem={renderCartItem}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.listContainer}
            />

            {/* Coupon Section */}
            <View style={styles.couponSection}>
                <Text style={styles.sectionTitle}>Have a coupon?</Text>
                <View style={styles.couponInputContainer}>
                    <TextInput
                        style={styles.couponInput}
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChangeText={setCouponInput}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={handleApplyCoupon}
                    >
                        <Text style={styles.applyButtonText}>Apply</Text>
                    </TouchableOpacity>
                </View>
                {couponCode && (
                    <View style={styles.appliedCoupon}>
                        <Text style={styles.appliedCouponText}>✓ {couponCode} applied</Text>
                        <TouchableOpacity onPress={removeCoupon}>
                            <Text style={styles.removeCouponText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Price Breakdown */}
            <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{subtotal.toFixed(2)} MT</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax (16%)</Text>
                    <Text style={styles.summaryValue}>{tax.toFixed(2)} MT</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service Charge (5%)</Text>
                    <Text style={styles.summaryValue}>{serviceCharge.toFixed(2)} MT</Text>
                </View>
                {deliveryFee > 0 && (
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Delivery Fee</Text>
                        <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} MT</Text>
                    </View>
                )}
                {discount > 0 && (
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, styles.discountText]}>Discount</Text>
                        <Text style={[styles.summaryValue, styles.discountText]}>-{discount.toFixed(2)} MT</Text>
                    </View>
                )}
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{total.toFixed(2)} MT</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
            >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    clearText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    itemCustomizations: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        color: '#94a3b8',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    quantityButton: {
        width: 32,
        height: 32,
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2563eb',
    },
    quantity: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 12,
        minWidth: 24,
        textAlign: 'center',
    },
    itemRight: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    itemSubtotal: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2563eb',
        marginBottom: 8,
    },
    removeButton: {
        padding: 4,
    },
    removeButtonText: {
        fontSize: 18,
    },
    couponSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 12,
    },
    couponInputContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    couponInput: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    applyButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    appliedCoupon: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        padding: 12,
        backgroundColor: '#d1fae5',
        borderRadius: 8,
    },
    appliedCouponText: {
        fontSize: 14,
        color: '#065f46',
        fontWeight: '600',
    },
    removeCouponText: {
        fontSize: 14,
        color: '#ef4444',
        fontWeight: '600',
    },
    summarySection: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 15,
        color: '#64748b',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1e293b',
    },
    discountText: {
        color: '#10b981',
    },
    totalRow: {
        borderTopWidth: 2,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2563eb',
    },
    checkoutButton: {
        backgroundColor: '#2563eb',
        margin: 20,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    checkoutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
    },
    browseButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
