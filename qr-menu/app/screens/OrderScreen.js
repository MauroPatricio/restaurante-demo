import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import axios from 'axios';

export default function OrderScreen({ route, navigation }) {
  const { item, tableId } = route.params;
  const [status, setStatus] = useState('pending');

  const placeOrder = () => {
    axios.post('http://localhost:4000/api/orders', {
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
      <Text style={{ fontSize: 20 }}>Pedido de {item.name}</Text>
      <Text>Status: {status}</Text>
      <Button title="Fazer Pedido" onPress={placeOrder} />
    </View>
  );
}
