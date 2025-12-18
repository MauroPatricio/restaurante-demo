import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import OrderStatus from './pages/OrderStatus';

function App() {
    return (
        <CartProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-gray-50">
                    <Routes>
                        <Route path="/menu/:restaurantId" element={<Menu />} />
                        <Route path="/menu/:restaurantId/cart" element={<Cart />} />
                        <Route path="/menu/:restaurantId/status/:orderId" element={<OrderStatus />} />
                        <Route path="/" element={<div>Scanning QR...</div>} />
                    </Routes>
                </div>
            </BrowserRouter>
        </CartProvider>
    );
}

export default App;
