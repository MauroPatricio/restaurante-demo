
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { feedbackAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import {
    Star, MessageSquare, TrendingUp, ThumbsUp, ThumbsDown,
    Meh, Filter, Download, MessageCircle, Smile, Frown
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

// Modern Card Styles (matching FinancialTab)
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
    flex: 1,
    minWidth: '200px'
};

const iconBoxStyle = (color, bg) => ({
    padding: '12px',
    borderRadius: '12px',
    color: color,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export default function CXDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        avgRating: 0,
        total: 0,
        nps: 0,
        sentiment: { positive: 0, neutral: 0, negative: 0 }
    });

    useEffect(() => {
        if (user?.restaurant) fetchFeedback();
    }, [user]);

    const fetchFeedback = async () => {
        try {
            const { data } = await feedbackAPI.getAll(user.restaurant._id || user.restaurant);
            const items = data.feedbacks || [];
            if (processFeedbacks) processFeedbacks(items);
        } catch (error) {
            console.error('Failed to fetch CX data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processFeedbacks = (items) => {
        if (items.length === 0) return;

        const total = items.length;
        const sum = items.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = (sum / total).toFixed(1);

        // NPS Proxy: 5 stars = Promoter, 3-4 = Neutral, 1-2 = Detractor
        const promoters = items.filter(i => i.rating === 5).length;
        const detractors = items.filter(i => i.rating <= 2).length;
        const nps = Math.round(((promoters - detractors) / total) * 100);

        // Sentiment
        const positive = items.filter(i => i.rating >= 4).length;
        const neutral = items.filter(i => i.rating === 3).length;
        const negative = items.filter(i => i.rating <= 2).length;

        setStats({
            avgRating: avg,
            total,
            nps,
            sentiment: { positive, neutral, negative }
        });
        setFeedbacks(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    };

    const renderStars = (rating) => (
        <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} stroke="currentColor" />
            ))}
        </div>
    );

    const chartData = [
        { name: '5 Stars', count: feedbacks.filter(f => f.rating === 5).length, color: '#22c55e' },
        { name: '4 Stars', count: feedbacks.filter(f => f.rating === 4).length, color: '#84cc16' },
        { name: '3 Stars', count: feedbacks.filter(f => f.rating === 3).length, color: '#eab308' },
        { name: '2 Stars', count: feedbacks.filter(f => f.rating === 2).length, color: '#f97316' },
        { name: '1 Star', count: feedbacks.filter(f => f.rating === 1).length, color: '#ef4444' },
    ];

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '80vh' }}>
            <LoadingSpinner size={48} />
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Loading Customer Insights...</span>
        </div>
    );

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        Experience Dashboard
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
                        Customer feedback and sentiment analysis
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Avg Rating
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats.avgRating}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', fontWeight: '600' }}>
                            out of 5.0
                        </p>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Star size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            NPS Score
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: stats.nps > 0 ? '#10b981' : '#ef4444', margin: '8px 0 0 0' }}>
                            {stats.nps > 0 ? '+' : ''}{stats.nps}
                        </h3>
                        <p style={{ fontSize: '12px', color: stats.nps > 0 ? '#10b981' : '#ef4444', marginTop: '4px', fontWeight: '600' }}>
                            {stats.nps > 0 ? 'Excellent' : 'Needs improvement'}
                        </p>
                    </div>
                    <div style={iconBoxStyle(stats.nps > 0 ? '#10b981' : '#ef4444', stats.nps > 0 ? '#ecfdf5' : '#fef2f2')}>
                        <TrendingUp size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Reviews
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats.total}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <MessageSquare size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Positive Rate
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {stats.total > 0 ? ((stats.sentiment.positive / stats.total) * 100).toFixed(0) : 0}%
                        </h3>
                        <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>
                            {stats.sentiment.positive} positive
                        </p>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <Smile size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Rating Distribution Chart */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        Rating Distribution
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Feedback Stream */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                        Recent Feedback
                    </h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {feedbacks.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', color: '#cbd5e1', fontStyle: 'italic' }}>
                                No feedback received recently.
                            </div>
                        ) : (
                            feedbacks.slice(0, 5).map(item => (
                                <div key={item._id} style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #f1f5f9',
                                    transition: 'background 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                height: '40px',
                                                width: '40px',
                                                borderRadius: '50%',
                                                background: '#eff6ff',
                                                color: '#3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '700',
                                                fontSize: '14px'
                                            }}>
                                                {item.customerName ? item.customerName.charAt(0).toUpperCase() : 'G'}
                                            </div>
                                            <div>
                                                <h4 style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px', margin: 0 }}>
                                                    {item.customerName || "Guest"}
                                                </h4>
                                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                                                    {format(new Date(item.createdAt), 'MMM d, yyyy • h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                        {renderStars(item.rating)}
                                    </div>
                                    <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                                        "{item.comment || "No comment provided."}"
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
