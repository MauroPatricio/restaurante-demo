import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const value = {
        user,
        token: null,
        loading: false,
        login: async () => { },
        logout: () => { },
        isAuthenticated: false
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
