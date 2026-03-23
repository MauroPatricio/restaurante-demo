import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function Dashboard({ route }) {
  const { t } = useTranslation();
  const { convertAndFormat } = useCurrency();
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
      <Text style={styles.header}>{t('restaurant_dashboard')}</Text>
      
      <Text style={styles.metric}>{t('sales_today', { total: convertAndFormat(totalSales) })}</Text>
      <Text style={styles.metric}>{t('open_orders', { count: orders.filter(o => o.status !== 'completed').length })}</Text>
 
      <Text style={styles.sectionHeader}>{t('current_orders')}</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{t('table')}: {item.table}</Text>
            <Text>{t('status')}: {t(item.status)}</Text>
            <Text>{t('total')}: {convertAndFormat(item.total)}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionHeader}>{t('customer_feedback')}</Text>
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
