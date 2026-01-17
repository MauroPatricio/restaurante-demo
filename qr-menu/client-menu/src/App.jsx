import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import OrderStatus from './pages/OrderStatus';
import OrderHistory from './pages/OrderHistory';
import { NotificationProvider } from './context/NotificationContext';
import { LoadingProvider } from './context/LoadingContext';
import LoadingSpinner from './components/LoadingSpinner';

import { API_URL } from './config/api';

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
                    `${API_URL}/public/menu/validate?r=${restaurantId}&t=${tableId}&token=${token}`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    console.error('❌ Expected JSON but received:', text.substring(0, 200));
                    throw new Error('Servidor retornou resposta inválida (não JSON)');
                }

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
                    <div className="flex justify-center mb-4">
                        <LoadingSpinner size={48} />
                    </div>
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

// Code Entry Component for manual access
function CodeEntry() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/public/menu/access-by-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            // Robust check for JSON response
            const contentType = response.headers.get("content-type");
            let data;

            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                // Not JSON - probably a 404 or 500 HTML page from proxy/server
                const text = await response.text();
                console.error('❌ Server returned non-JSON response:', text.substring(0, 500));
                throw new Error('O servidor encontrou um erro e não retornou JSON. Verifique a conexão.');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Código inválido');
            }

            if (data.valid) {
                // Store validation data
                sessionStorage.setItem('qr_validation', JSON.stringify({
                    restaurant: data.restaurant,
                    table: data.table,
                    token: new URLSearchParams(data.redirectUrl.split('?')[1]).get('token'), // Extract token from URL
                    timestamp: Date.now()
                }));
                // Redirect to the URL provided by backend
                window.location.href = data.redirectUrl;
                // We use window.location.href to ensure a clean navigation, 
                // but navigate(data.redirectUrl) would also work if the path is relative.
                // Since data.redirectUrl from backend is relative (/menu/...), navigate is better for SPA.
                navigate(data.redirectUrl);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Erro ao validar o código. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">QR Menu</h1>
                    <p className="text-blue-100">Acesse o menu da sua mesa</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código da Mesa (6 dígitos)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength="6"
                                placeholder="000000"
                                className="w-full text-center text-4xl tracking-[0.5em] font-mono font-bold py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase placeholder-gray-200 text-gray-800"
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setCode(val);
                                    if (error) setError('');
                                }}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={code.length !== 6 || loading}
                            className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5
                                ${code.length === 6 && !loading
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <LoadingSpinner size={20} color="white" />
                                    Verificando...
                                </span>
                            ) : 'Acessar Menu'}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">Ou escaneie o QR Code na sua mesa</p>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <CartProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <LoadingProvider>
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                            <Routes>
                                <Route path="/menu" element={<QRRedirect />} />
                                <Route path="/menu/:restaurantId" element={<Menu />} />
                                <Route path="/menu/:restaurantId/cart" element={<Cart />} />
                                <Route path="/menu/:restaurantId/status/:orderId" element={<OrderStatus />} />
                                <Route path="/menu/:restaurantId/history" element={<OrderHistory />} />
                                <Route path="/" element={<CodeEntry />} />
                            </Routes>
                        </div>
                    </LoadingProvider>
                </NotificationProvider>
            </ThemeProvider>
        </CartProvider>
    );
}

export default App;
