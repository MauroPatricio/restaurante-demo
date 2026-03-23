import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert
} from 'react-native';
import { useCart } from '../contexts/CartContext';
import { orderAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';

export default function CheckoutScreen({ navigation }) {
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();
    const {
        items,
        total,
        restaurantId,
        tableId,
        orderType,
        deliveryAddress,
        couponCode,
        discount,
        clearCart,
        setOrderType,
        setDeliveryAddress,
    } = useCart();

    const [selectedPayment, setSelectedPayment] = React.useState('cash');

    const handlePlaceOrder = async () => {
        try {
            const orderData = {
                restaurant: restaurantId,
                table: tableId,
                orderType,
                items: items.map(item => ({
                    item: item.menuItem._id,
                    qty: item.quantity,
                    customizations: item.customizations,
                })),
                customerPhone: '+258841234567', //TODO: Get from user profile
                deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
                couponCode,
            };

            const response = await orderAPI.createOrder(orderData);
            Alert.alert(t('success'), t('order_placed'));
            clearCart();
            navigation.navigate('OrderStatus', { orderId: response.data.order.id });
        } catch (error) {
            Alert.alert(t('error'), t('failed_place_order'));
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Order Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('order_type')}</Text>
                    <View style={styles.orderTypeContainer}>
                        {['dine-in', 'takeaway', 'delivery'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.orderTypeButton,
                                    orderType === type && styles.orderTypeButtonActive,
                                ]}
                                onPress={() => setOrderType(type)}
                            >
                                <Text style={[
                                    styles.orderTypeText,
                                    orderType === type && styles.orderTypeTextActive,
                                ]}>
                                    {type === 'dine-in' ? `🍽️ ${t('dine_in')}` :
                                        type === 'takeaway' ? `🥡 ${t('takeaway')}` : `🚚 ${t('delivery')}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Delivery Address (if delivery) */}
                {orderType === 'delivery' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('delivery_address')}</Text>
                        <TouchableOpacity
                            style={styles.addressButton}
                            onPress={() => navigation.navigate('DeliveryAddress')}
                        >
                            <Text style={styles.addressText}>
                                {deliveryAddress || t('add_delivery_address')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('payment_method')}</Text>
                    {['cash', 'mpesa', 'emola'].map((method) => (
                        <TouchableOpacity
                            key={method}
                            style={[
                                styles.paymentOption,
                                selectedPayment === method && styles.paymentOptionActive,
                            ]}
                            onPress={() => setSelectedPayment(method)}
                        >
                            <View style={styles.paymentInfo}>
                                <Text style={styles.paymentIcon}>
                                    {method === 'cash' ? '💵' : method === 'mpesa' ? '📱' : '📲'}
                                </Text>
                                <Text style={styles.paymentName}>
                                    {method === 'cash' ? t('cash_on_delivery') :
                                        method === 'mpesa' ? t('mpesa') : t('emola')}
                                </Text>
                            </View>
                            {selectedPayment === method && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Order Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('order_summary')}</Text>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryText}>{items.length === 1 ? t('items_count_one') : t('items_count', { count: items.length })}</Text>
                        <Text style={styles.summaryPrice}>{convertAndFormat(total)}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.placeOrderButton}
                    onPress={handlePlaceOrder}
                >
                    <Text style={styles.placeOrderButtonText}>
                        {t('place_order')} - {convertAndFormat(total)}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
    },
    orderTypeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    orderTypeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    orderTypeButtonActive: {
        backgroundColor: '#2563eb',
    },
    orderTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    orderTypeTextActive: {
        color: '#fff',
    },
    addressButton: {
        padding: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    addressText: {
        fontSize: 16,
        color: '#64748b',
    },
    paymentOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    paymentOptionActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    paymentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    paymentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    checkmark: {
        fontSize: 24,
        color: '#2563eb',
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
    },
    summaryText: {
        fontSize: 16,
        color: '#64748b',
    },
    summaryPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563eb',
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    placeOrderButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    placeOrderButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
