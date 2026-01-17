import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Check, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SystemAdmin() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, all

    useEffect(() => {
        fetchTransactions();
    }, [filter]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:4001/api/subscriptions/transactions/list?view=admin_all&status=${filter === 'all' ? '' : filter}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTransactions(response.data.transactions);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            alert('Failed to load transactions. Ensure you are authorized.');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id, status, reason = '') => {
        if (!confirm(`Are you sure you want to ${status} this request?`)) return;

        try {
            await axios.patch(`http://localhost:4001/api/subscriptions/transactions/${id}/review`, {
                status,
                rejectionReason: reason
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert(`Transaction ${status} successfully!`);
            fetchTransactions();
        } catch (error) {
            console.error('Action failed:', error);
            alert('Failed to process transaction');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>System Administration</h2>
                    <p>Manage subscription payments and approvals</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className={`btn-secondary ${filter === 'pending' ? 'active-filter' : ''}`}
                        onClick={() => setFilter('pending')}
                        style={{ background: filter === 'pending' ? '#e5e7eb' : 'white' }}
                    >
                        Pending
                    </button>
                    <button
                        className={`btn-secondary ${filter === 'all' ? 'active-filter' : ''}`}
                        onClick={() => setFilter('all')}
                        style={{ background: filter === 'all' ? '#e5e7eb' : 'white' }}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px' }}>
                        <LoadingSpinner size={48} />
                        <span>Loading requests...</span>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Restaurant</th>
                                <th>User</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No transactions found.</td></tr>
                            ) : (
                                transactions.map(tx => (
                                    <tr key={tx._id}>
                                        <td>{format(new Date(tx.createdAt), 'MMM dd HH:mm')}</td>
                                        <td>{tx.restaurant?.name || 'Unknown'}</td>
                                        <td>{tx.requestedBy?.name || tx.requestedBy?.email}</td>
                                        <td>{tx.method.toUpperCase()}</td>
                                        <td className="font-mono">{tx.reference}</td>
                                        <td>{tx.amount?.toLocaleString()} MT</td>
                                        <td>
                                            <span className={`status-badge ${tx.status}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td>
                                            {tx.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button
                                                        className="icon-btn success"
                                                        title="Approve"
                                                        onClick={() => handleReview(tx._id, 'approved')}
                                                        style={{ color: '#16a34a', background: '#dcfce7' }}
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn danger"
                                                        title="Reject"
                                                        onClick={() => {
                                                            const reason = prompt('Enter rejection reason:');
                                                            if (reason) handleReview(tx._id, 'rejected', reason);
                                                        }}
                                                        style={{ color: '#dc2626', background: '#fee2e2' }}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            )}
                                            {tx.status !== 'pending' && (
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                                    Processed by {tx.processedBy?.name || 'Admin'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
