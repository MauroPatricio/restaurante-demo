import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function MenuCard({ item, onPress, onAddToCart }) {
    const hasImage = item.photo && item.photo.trim() !== '';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {hasImage ? (
                <Image
                    source={{ uri: item.photo }}
                    style={styles.image}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>🍽️</Text>
                </View>
            )}

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    {!item.available && (
                        <View style={styles.unavailableBadge}>
                            <Text style={styles.unavailableText}>Unavailable</Text>
                        </View>
                    )}
                </View>

                {item.description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.footer}>
                    <View>
                        {item.category && (
                            <Text style={styles.category}>{item.category}</Text>
                        )}
                        <Text style={styles.price}>{item.price} MT</Text>
                    </View>

                    {item.available && onAddToCart && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onAddToCart(item);
                            }}
                        >
                            <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 160,
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 48,
    },
    content: {
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
    },
    unavailableBadge: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginLeft: 8,
    },
    unavailableText: {
        fontSize: 10,
        color: '#991b1b',
        fontWeight: '500',
    },
    description: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    category: {
        fontSize: 11,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563eb',
    },
    addButton: {
        width: 36,
        height: 36,
        backgroundColor: '#2563eb',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
        marginTop: -2,
    },
});
