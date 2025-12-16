import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { feedbackAPI } from '../services/api';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function Feedback() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ averageError: 0, averageRating: 0, total: 0 });

    useEffect(() => {
        if (user?.restaurant) {
            fetchFeedback();
        }
    }, [user]);

    const fetchFeedback = async () => {
        try {
            const response = await feedbackAPI.getAll(user.restaurant._id || user.restaurant);
            const data = response.data.feedbacks || [];
            setFeedbacks(data);

            // Calculate stats
            if (data.length > 0) {
                const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
                setStats({
                    averageRating: avg.toFixed(1),
                    total: data.length
                });
            }
        } catch (error) {
            console.error('Failed to fetch feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <Star
                key={i}
                size={16}
                fill={i < rating ? "#FFD700" : "none"}
                color={i < rating ? "#FFD700" : "#ccc"}
            />
        ));
    };

    if (loading) return <div>{t('loading') || 'Loading...'}</div>;

    return (
        <div className="feedback-page">
            <div className="page-header">
                <div>
                    <h2>{t('feedback_title')}</h2>
                    <p>{t('feedback_desc')}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '30px' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                        <Star size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.averageRating} / 5.0</h3>
                        <p>{t('average_rating')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.total}</h3>
                        <p>{t('total_reviews')}</p>
                    </div>
                </div>
            </div>

            {/* Feedback List */}
            <div className="feedback-list">
                {feedbacks.map(item => (
                    <div key={item._id} className="card feedback-card" style={{ marginBottom: '15px' }}>
                        <div className="feedback-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span className="customer-name" style={{ fontWeight: 'bold' }}>
                                    {item.customerName || t('guest')}
                                </span>
                                <div className="stars" style={{ display: 'flex' }}>
                                    {renderStars(item.rating)}
                                </div>
                            </div>
                            <span className="date" style={{ color: '#666', fontSize: '0.9em' }}>
                                {format(new Date(item.createdAt), 'PP')}
                            </span>
                        </div>
                        {item.comment && (
                            <p className="feedback-comment" style={{ color: '#444', fontStyle: 'italic' }}>
                                "{item.comment}"
                            </p>
                        )}
                        <div className="feedback-meta" style={{ marginTop: '10px', fontSize: '0.85em', color: '#888' }}>
                            {t('order_id')}: #{item.order ? item.order.slice(-6).toUpperCase() : 'N/A'}
                        </div>
                    </div>
                ))}

                {feedbacks.length === 0 && (
                    <div className="empty-state">
                        <p>{t('no_feedback') || 'No feedback yet.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
