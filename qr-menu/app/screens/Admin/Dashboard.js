import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';

export default function Dashboard({ route }) {
  const { restaurantId = 'RESTAURANT_ID_FAKE' } = route.params || {};
  const [orders, setOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [feedback, setFeedback] = useState([]);

  const loadData = async () => {
    try {
      const [ordersRes, feedbackRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/orders/restaurant/${restaurantId}`),
        axios.get(`http://localhost:4000/api/feedback/${restaurantId}`)
      ]);

      setOrders(ordersRes.data);
      setFeedback(feedbackRes.data);
      setTotalSales(
        ordersRes.data
          .filter(o => o.status === 'completed')
          .reduce((acc, cur) => acc + cur.total, 0)
      );
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadData();
    const socket = io('http://localhost:4000');
    socket.on('order-status', () => loadData());
    return () => socket.disconnect();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dashboard do Restaurante</Text>
      
      <Text style={styles.metric}>Vendas do dia: ${totalSales.toFixed(2)}</Text>
      <Text style={styles.metric}>Pedidos em aberto: {orders.filter(o => o.status !== 'completed').length}</Text>

      <Text style={styles.sectionHeader}>Pedidos Atuais</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Mesa: {item.table}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Total: ${item.total}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionHeader}>Feedback dos Clientes</Text>
      <FlatList
        data={feedback}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.customerPhone}: {item.emotion}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  metric: { fontSize: 16, marginBottom: 5 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  card: { padding: 10, borderWidth: 1, marginBottom: 5 }
});
