import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert
} from 'react-native';
import { useCart } from '../contexts/CartContext';

export default function DeliveryAddressScreen({ navigation }) {
    const { deliveryAddress, setDeliveryAddress } = useCart();

    // Parse existing address if available
    const existingAddress = deliveryAddress ?
        (typeof deliveryAddress === 'string' ? { street: deliveryAddress } : deliveryAddress) : {};

    const [street, setStreet] = useState(existingAddress.street || '');
    const [apartment, setApartment] = useState(existingAddress.apartment || '');
    const [city, setCity] = useState(existingAddress.city || 'Maputo');
    const [phone, setPhone] = useState(existingAddress.phone || '');
    const [instructions, setInstructions] = useState(existingAddress.instructions || '');

    const handleSave = () => {
        if (!street.trim()) {
            Alert.alert('Required', 'Please enter your street address');
            return;
        }

        if (!phone.trim()) {
            Alert.alert('Required', 'Please enter your contact phone number');
            return;
        }

        // Validate phone format (simple validation)
        const phoneRegex = /^\+?258[0-9]{9}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            Alert.alert('Invalid Phone', 'Please enter a valid Mozambican phone number (e.g., +258841234567)');
            return;
        }

        const address = {
            street: street.trim(),
            apartment: apartment.trim(),
            city: city.trim(),
            phone: phone.trim(),
            instructions: instructions.trim(),
            formatted: `${street}${apartment ? ', ' + apartment : ''}, ${city}`
        };

        setDeliveryAddress(address);
        Alert.alert('Success', 'Delivery address saved!');
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>
                    <Text style={styles.title}>Delivery Address</Text>
                    <Text style={styles.subtitle}>Where should we deliver your order?</Text>

                    {/* Street Address */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Street Address *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter street name and number"
                            value={street}
                            onChangeText={setStreet}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Apartment/Floor */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Apartment / Floor (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Apt 4B, 2nd Floor"
                            value={apartment}
                            onChangeText={setApartment}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* City */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>City *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter city"
                            value={city}
                            onChangeText={setCity}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Contact Phone */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Contact Phone *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+258841234567"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />
                        <Text style={styles.hint}>Format: +258XXXXXXXXX</Text>
                    </View>

                    {/* Delivery Instructions */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Delivery Instructions (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="e.g., Ring doorbell, Leave at gate, etc."
                            value={instructions}
                            onChangeText={setInstructions}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>ℹ️</Text>
                        <Text style={styles.infoText}>
                            Please ensure your address is correct. Delivery fee: 50 MT
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Address</Text>
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
    content: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    textArea: {
        height: 100,
        paddingTop: 14,
    },
    hint: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 6,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#dbeafe',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    infoIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
