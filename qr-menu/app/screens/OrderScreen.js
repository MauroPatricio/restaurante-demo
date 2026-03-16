import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { orderAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

export default function OrderScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { item, tableId } = route.params;
  const [status, setStatus] = useState('pending');

  const placeOrder = () => {
    orderAPI.createOrder({
      table: tableId,
      items: [{ item: item._id, qty: 1 }],
      total: item.price
    })
    .then(() => {
      setStatus('preparing');
      navigation.navigate('Status');
    })
    .catch(() => setStatus('error'));
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20 }}>{t('order_for', { name: item.name })}</Text>
      <Text>{t('status')}: {t(status)}</Text>
      <Button title={t('place_order')} onPress={placeOrder} />
    </View>
  );
}
