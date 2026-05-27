import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Column from './components/kanban/Column'; // Ajustado para o caminho correto do componente
import { useAuth } from './contexts/AuthContext';
import api from './services/api';

export default function KanbanBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.restaurant) {
        setLoading(false);
        setError(t('restaurant_not_found'));
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const restaurantId = typeof user.restaurant === 'object' ? user.restaurant._id : user.restaurant;
        
        // Busca apenas os pedidos com os status relevantes para o Kanban
        const response = await api.get('/orders', {
          params: {
            restaurantId,
            status: 'kitchen_preparing,ready_for_pickup' // Filtro por múltiplos status
          }
        });
        setOrders(response.data);
      } catch (err) {
        setError(t('error_loading_orders'));
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, t]);

  const handleDragStart = (e, orderId) => {
    // Guarda o ID do card a ser arrastado
    e.dataTransfer.setData('orderId', orderId);
  };

  const handleDrop = async (orderId, newStatus) => {
    const originalOrders = [...orders];
    const orderToUpdate = orders.find((o) => o.id === orderId);

    if (!orderToUpdate || orderToUpdate.status === newStatus) return;

    // 1. Atualização Otimista: A UI atualiza instantaneamente
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    setError(null);

    // 2. Persistência no Backend
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
    } catch (err) {
      // 3. Rollback em caso de erro
      setError(t('error_moving_order', { orderId }));
      setOrders(originalOrders);
    }
  };

  // Separa os pedidos por colunas
  const kitchenOrders = orders.filter(o => o.status === 'kitchen_preparing');
  const readyOrders = orders.filter(o => o.status === 'ready_for_pickup');

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading_orders')}</div>;
  if (error) return <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px', overflowX: 'auto' }}>
      <Column 
        title={t('kitchen_monitor')} 
        status="kitchen_preparing" 
        orders={kitchenOrders} 
        onDragStart={handleDragStart} 
        onDrop={handleDrop} 
      />
      <Column 
        title={t('ready_for_pickup')} 
        status="ready_for_pickup" 
        orders={readyOrders} 
        onDragStart={handleDragStart} 
        onDrop={handleDrop} 
      />
    </div>
  );
}