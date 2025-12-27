import React, { useState, useEffect } from 'react';
import Toast from './Toast';

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none'
            }}
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    style={{
                        pointerEvents: 'auto',
                        animation: toast.removing ? 'slideOut 0.3s ease-in forwards' : 'none'
                    }}
                >
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        persistent={toast.persistent}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
