
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, menuAPI } from '../services/api';
import {
    Package, AlertTriangle, TrendingUp, DollarSign,
    RefreshCw, Save, Edit2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function StockDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState({ summary: {}, items: [] });
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState(0);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) fetchStockData();
    }, [restaurantId]);

    const fetchStockData = async () => {
        try {
            const { data } = await analyticsAPI.getInventory(restaurantId);
            setData(data);
        } catch (error) {
            console.error('Failed to fetch stock data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item._id);
        setEditValue(item.stock);
    };

    const handleSaveStock = async (id) => {
        try {
            await menuAPI.update(id, { stock: parseInt(editValue) });
            setEditingId(null);
            fetchStockData(); // Refresh to update calculations
        } catch (error) {
            console.error('Failed to update stock:', error);
            alert('Failed to update stock');
        }
    };

    if (loading) return <div className="p-8">Loading Inventory...</div>;

    const chartData = data.items.slice(0, 10).map(i => ({
        name: i.name,
        value: i.totalValue
    }));

    return (
        <div className="p-8 bg-gray-50 min-h-screen space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Stock & Costs</h1>
                    <p className="text-gray-500 mt-1">Inventory management and valuation</p>
                </div>
                <button onClick={fetchStockData} className="btn-secondary flex items-center gap-2">
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase">Total Items</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{data.summary.totalItems}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Package size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase">Inventory Value</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                            {data.summary.totalValue?.toLocaleString()} MT
                        </h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <DollarSign size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase">Low Stock Alerts</p>
                        <h3 className={`text-3xl font-bold mt-1 ${data.summary.lowStockCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            {data.summary.lowStockCount}
                        </h3>
                    </div>
                    <div className={`p-3 rounded-lg ${data.summary.lowStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stock Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Inventory Levels</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3">Cost/Unit</th>
                                    <th className="px-6 py-3">Total Value</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.items.map(item => (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4">
                                            {editingId === item._id ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    className="w-20 p-1 border rounded"
                                                />
                                            ) : (
                                                <span className={item.stock < 10 ? 'text-red-600 font-bold' : ''}>
                                                    {item.stock}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{item.costPrice} MT</td>
                                        <td className="px-6 py-4 font-mono font-medium">{item.totalValue.toLocaleString()} MT</td>
                                        <td className="px-6 py-4">
                                            {item.stock < 10 ? (
                                                <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold">Low</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-bold">OK</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingId === item._id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleSaveStock(item._id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-50 p-1 rounded"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Value Items Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Value Items</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-4">Calculated by Stock Quantity × Cost Price</p>
                </div>
            </div>
        </div>
    );
}
