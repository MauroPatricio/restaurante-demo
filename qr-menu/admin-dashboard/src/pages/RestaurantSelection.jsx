import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { LogOut, Building2, ChevronRight, PlusCircle } from 'lucide-react';

const RestaurantSelection = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (location.state?.restaurants) {
            setRestaurants(location.state.restaurants);
        } else if (user?.restaurants && Array.isArray(user.restaurants)) {
            // If user data already has populated restaurants (from login response)
            setRestaurants(user.restaurants);
        } else {
            // Fallback: Fetch restaurants if not available (requires endpoint, but we rely on login data for now)
            // Or redirect to login if no context
            if (!user) navigate('/login');
        }
    }, [user, location.state]);

    const handleSelectRestaurant = async (restaurantId) => {
        setLoading(true);
        setError('');
        try {
            await login(null, restaurantId); // Corrected: login(credentials, restaurantId)
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Failed to enter restaurant. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Select Restaurant</h1>
                    <p className="text-gray-600 mt-2">Choose a workspace to continue</p>

                    {(user?.role?.name === 'Owner' || user?.role?.isSystem) && (
                        <button
                            onClick={() => navigate('/owner-dashboard')}
                            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium text-sm inline-flex items-center gap-2"
                        >
                            <Building2 size={16} /> Access Global Owner Dashboard
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm">
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

                <div className="space-y-4">
                    {restaurants.map((restaurant) => (
                        <button
                            key={restaurant.id || restaurant._id}
                            onClick={() => handleSelectRestaurant(restaurant.id || restaurant._id)}
                            disabled={loading}
                            className="w-full bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center">
                                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                    <Building2 size={24} />
                                </div>
                                <div className="ml-4 text-left">
                                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                        {restaurant.name}
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </button>
                    ))}

                    <button
                        onClick={() => navigate('/register')} // Or specific add restaurant flow
                        className="w-full bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center text-gray-500 hover:text-blue-600 gap-2"
                    >
                        <PlusCircle size={20} />
                        <span className="font-medium">Add New Restaurant</span>
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 mx-auto"
                    >
                        <LogOut size={16} />
                        Sign out of {user?.email}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantSelection;
