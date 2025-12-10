import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { orderAPI } from '../services/api';

const STATUS_STEPS = [
    { key: 'pending', label: 'Pending', emoji: '🕐' },
    { key: 'confirmed', label: 'Confirmed', emoji: '✓' },
    { key: 'preparing', label: 'Preparing', emoji: '👨‍🍳' },
    { key: 'ready', label: 'Ready', emoji: '✅' },
    { key: 'completed', label: 'Completed', emoji: '🎉' },
];

export default function OrderStatusScreen({ route }) {
    const { orderId } = route.params;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchOrder = async () => {
        try {
            const response = await orderAPI.getOrder(orderId);
            setOrder(response.data.order);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch order:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Order not found</Text>
            </View>
        );
    }

    const currentIndex = STATUS_STEPS.findIndex(s => s.key === order.status);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Order #{orderId.slice(-6).toUpperCase()}</Text>
                <Text style={styles.orderType}>{order.orderType}</Text>
            </View>

            <View style={styles.statusContainer}>
                {STATUS_STEPS.map((step, index) => {
                    const isActive = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <View key={step.key} style={styles.statusStep}>
                            <View style={[
                                styles.statusCircle,
                                isActive && styles.statusCircleActive,
                                isCurrent && styles.statusCircleCurrent,
                            ]}>
                                <Text style={styles.statusEmoji}>{step.emoji}</Text>
                            </View>
                            <Text style={[
                                styles.statusLabel,
                                isActive && styles.statusLabelActive,
                            ]}>
                                {step.label}
                            </Text>
                            {index < STATUS_STEPS.length - 1 && (
                                <View style={[
                                    styles.statusLine,
                                    isActive && styles.statusLineActive,
                                ]} />
                            )}
                        </View>
                    );
                })}
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Order Details</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Items:</Text>
                    <Text style={styles.detailValue}>{order.items?.length || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total:</Text>
                    <Text style={styles.detailValue}>{order.total} MT</Text>
                </View>
                {order.estimatedReadyTime && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Estimated Ready:</Text>
                        <Text style={styles.detailValue}>
                            {new Date(order.estimatedReadyTime).toLocaleTimeString()}
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 18,
        color: '#64748b',
    },
    header: {
        backgroundColor: '#fff',
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    orderType: {
        fontSize: 14,
        color: '#64748b',
        textTransform: 'capitalize',
    },
    statusContainer: {
        padding: 40,
    },
    statusStep: {
        alignItems: 'center',
        marginBottom: 24,
    },
    statusCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusCircleActive: {
        backgroundColor: '#dbeafe',
    },
    statusCircleCurrent: {
        backgroundColor: '#2563eb',
    },
    statusEmoji: {
        fontSize: 28,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94a3b8',
    },
    statusLabelActive: {
        color: '#1e293b',
    },
    statusLine: {
        width: 2,
        height: 20,
        backgroundColor: '#e2e8f0',
        marginTop: 8,
    },
    statusLineActive: {
        backgroundColor: '#2563eb',
    },
    detailsContainer: {
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: '#64748b',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
});
