import axios from 'axios';

import { API_URL } from '../config/api';

// Create waiter call
export const createWaiterCall = async (tableId, type = 'call') => {
    try {
        const response = await axios.post(`${API_URL}/waiter-calls`, {
            tableId,
            type
        });
        return response.data;
    } catch (error) {
        console.error('Create waiter call error:', error);
        throw error;
    }
};

// Create client reaction
export const createClientReaction = async (tableId, reactionType, comment = '') => {
    try {
        const response = await axios.post(`${API_URL}/client-reactions`, {
            tableId,
            reactionType,
            comment
        });
        return response.data;
    } catch (error) {
        console.error('Create client reaction error:', error);
        throw error;
    }
};

export default {
    createWaiterCall,
    createClientReaction
};
