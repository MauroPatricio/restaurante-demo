import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { format } from 'date-fns';
import { Eye, RefreshCw } from 'lucide-react';

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchOrders();
        }
    }, [user, filter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await orderAPI.getAll(user.restaurant._id || user.restaurant, params);
            setOrders(response.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await orderAPI.updateStatus(orderId, newStatus);
            fetchOrders();
        } catch (error) {
            console.error('Failed to update order:', error);
            alert('Failed to update order status');
        }
    };

    const statusColors = {
        pending: 'yellow',
        confirmed: 'blue',
        preparing: 'purple',
        ready: 'orange',
        served: 'green',
        completed: 'green',
        cancelled: 'red'
    };

    return (
        <div className="orders-page">
            <div className="page-header">
                <div>
                    <h2>Orders Management</h2>
                    <p>View and manage all orders</p>
                </div>
                <button onClick={fetchOrders} className="btn-secondary">
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="filters">
                {['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`filter-btn ${filter === status ? 'active' : ''}`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="loading">Loading orders...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date & Time</th>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Payment</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td className="font-mono">#{order._id.slice(-6).toUpperCase()}</td>
                                    <td>{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                                    <td>
                                        <div>
                                            <div className="font-semibold">{order.customerName || 'Guest'}</div>
                                            <div className="text-sm text-gray">{order.phone}</div>
                                        </div>
                                    </td>
                                    <td><span className="badge">{order.orderType}</span></td>
                                    <td>{order.items?.length || 0} items</td>
                                    <td className="font-semibold">{order.total} MT</td>
                                    <td>
                                        <span className={`status-badge ${order.paymentStatus}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${statusColors[order.status]}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                                    className="btn-small btn-primary"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {order.status === 'confirmed' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'preparing')}
                                                    className="btn-small btn-primary"
                                                >
                                                    Start Preparing
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'ready')}
                                                    className="btn-small btn-primary"
                                                >
                                                    Mark Ready
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'completed')}
                                                    className="btn-small btn-primary"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {orders.length === 0 && (
                        <div className="empty-state">
                            <p>No orders found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
