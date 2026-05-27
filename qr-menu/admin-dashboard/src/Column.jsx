import React from 'react';
import OrderCard from './OrderCard';

export default function Column({ title, status, orders, onDragStart, onDrop }) {
  const handleDragOver = (e) => {
    e.preventDefault(); // Necessário para permitir o drop nativo do HTML5
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    onDrop(orderId, status);
  };

  return (
    <div 
      className="kanban-column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundColor: '#f4f5f7',
        padding: '16px',
        borderRadius: '8px',
        minHeight: '400px',
        width: '320px'
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#172b4d' }}>{title} ({orders.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {orders.map(order => (
          <OrderCard key={order.id} order={order} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}