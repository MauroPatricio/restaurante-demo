import React from 'react';
import './StickyCard.css';

export default function OrderCard({ order, onDragStart }) {
  // Define se o card fica amarelo baseado no status (estilo Trello)
  const isYellowCard = order.status === 'ready_for_pickup' || order.status === 'kitchen_preparing';
  const cardClass = isYellowCard ? 'sticky-card-yellow' : 'sticky-card-default';

  return (
    <article 
      className={cardClass}
      draggable={true}
      onDragStart={(e) => onDragStart(e, order.id)}
      aria-label={`Pedido ${order.id} para a Mesa ${order.tableNumber}`}
    >
      <header className="sticky-card-header">
        <span>Pedido #{order.id}</span>
        <span>Mesa {order.tableNumber}</span>
      </header>
      
      <div className="sticky-card-body">
        {order.items && order.items.length > 0 ? (
          <ul>
            {order.items.map((item, index) => (
              <li key={item.id || index}>
                <strong>{item.quantity}x</strong> {item.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-items-text">Nenhum item encontrado.</p>
        )}
      </div>
    </article>
  );
}