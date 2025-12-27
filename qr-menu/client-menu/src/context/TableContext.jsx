import React, { createContext, useContext, useState, useEffect } from 'react';

const TableContext = createContext();

export const useTable = () => {
    const context = useContext(TableContext);
    if (!context) {
        throw new Error('useTable must be used within a TableProvider');
    }
    return context;
};

export const TableProvider = ({ children }) => {
    const [restaurant, setRestaurant] = useState(null);
    const [table, setTable] = useState(null);
    const [token, setToken] = useState(null);
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load validation data from sessionStorage
        const validationData = sessionStorage.getItem('qr_validation');

        if (validationData) {
            try {
                const data = JSON.parse(validationData);

                // Check if data is still valid (e.g., not too old)
                const age = Date.now() - data.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                if (age < maxAge) {
                    setRestaurant(data.restaurant);
                    setTable(data.table);
                    setToken(data.token);
                    setIsValid(true);
                } else {
                    // Data too old, clear it
                    sessionStorage.removeItem('qr_validation');
                }
            } catch (error) {
                console.error('Error loading validation data:', error);
                sessionStorage.removeItem('qr_validation');
            }
        }

        setLoading(false);
    }, []);

    const value = {
        restaurant,
        table,
        token,
        isValid,
        loading,
        setRestaurant,
        setTable,
        setToken,
        setIsValid
    };

    return (
        <TableContext.Provider value={value}>
            {children}
        </TableContext.Provider>
    );
};
