import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import OrderStatus from './pages/OrderStatus';
import OrderHistory from './pages/OrderHistory';
import { NotificationProvider } from './context/NotificationContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// QR Code redirect component
function QRRedirect() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateQR = async () => {
            const restaurantId = searchParams.get('r') || searchParams.get('restaurant');
            const tableId = searchParams.get('t') || searchParams.get('table');
            const token = searchParams.get('token');

            // Check if all required parameters are present
            if (!restaurantId || !tableId || !token) {
                setError('QR Code inválido. Parâmetros faltando.');
                setLoading(false);
                return;
            }

            try {
                // Validate the QR code with the backend
                const response = await fetch(
                    `${API_URL}/public/menu/validate?r=${restaurantId}&t=${tableId}&token=${token}`
                );

                if (!response.ok) {
                    const data = await response.json();
                    setError(data.message || 'Erro ao validar QR Code');
                    setLoading(false);
                    return;
                }

                const data = await response.json();

                if (data.valid) {
                    // Store validation data in sessionStorage for the menu
                    sessionStorage.setItem('qr_validation', JSON.stringify({
                        restaurant: data.restaurant,
                        table: data.table,
                        token,
                        timestamp: Date.now()
                    }));

                    // Redirect to menu
                    const finalTable = searchParams.get('t') || searchParams.get('table');
                    navigate(`/menu/${restaurantId}?t=${finalTable}&token=${token}`);
                } else {
                    setError('QR Code inválido');
                    setLoading(false);
                }
            } catch (error) {
                console.error('Validation error:', error);
                setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
                setLoading(false);
            }
        };

        validateQR();
    }, [searchParams, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Carregando Menu...</h2>
                    <p className="text-gray-600">Validando QR Code</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

function App() {
    return (
        <CartProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                        <Routes>
                            <Route path="/menu" element={<QRRedirect />} />
                            <Route path="/menu/:restaurantId" element={<Menu />} />
                            <Route path="/menu/:restaurantId/cart" element={<Cart />} />
                            <Route path="/menu/:restaurantId/status/:orderId" element={<OrderStatus />} />
                            <Route path="/menu/:restaurantId/history" element={<OrderHistory />} />
                            <Route path="/" element={<div className="min-h-screen flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">QR Menu</h1>
                                    <p className="text-gray-600 dark:text-gray-400">Por favor, escaneie um QR Code da mesa</p>
                                </div>
                            </div>} />
                        </Routes>
                    </div>
                </NotificationProvider>
            </ThemeProvider>
        </CartProvider>
    );
}

export default App;
