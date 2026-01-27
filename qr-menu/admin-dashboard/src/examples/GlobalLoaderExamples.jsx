/**
 * EXEMPLO: Como usar o GlobalLoader em diferentes cenários
 * Este arquivo demonstra casos de uso práticos
 */

// ============================================
// EXEMPLO 1: Fullscreen Loading em Navegação
// ============================================
import { useNavigate } from 'react-router-dom';
import { useLoading } from '../contexts/LoadingContext';
import { LOADING_TYPES } from '../utils/loadingManager';

export function NavigationExample() {
    const navigate = useNavigate();
    const { showLoading, hideLoading } = useLoading();

    const handleNavigate = async (path) => {
        // Mostrar loading fullscreen
        showLoading(LOADING_TYPES.FULL, 'Carregando página...');

        try {
            // Simular carregamento de dados
            await new Promise(resolve => setTimeout(resolve, 1000));
            navigate(path);
        } finally {
            hideLoading(LOADING_TYPES.FULL);
        }
    };

    return (
        <button onClick={() => handleNavigate('/dashboard')}>
            Ir para Dashboard
        </button>
    );
}

// ============================================
// EXEMPLO 2: Discrete Loading em Background
// ============================================
import { useEffect } from 'react';

export function RealtimeDataExample() {
    const { showLoading, hideLoading } = useLoading();

    const refreshData = async () => {
        // Loading discreto no canto superior direito
        showLoading(LOADING_TYPES.BACKGROUND, 'Atualizando dados...');

        try {
            const response = await fetch('/api/data');
            const data = await response.json();
            // Processar dados...
        } finally {
            hideLoading(LOADING_TYPES.BACKGROUND);
        }
    };

    // Auto-refresh a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, []);

    return <div>Dados em tempo real</div>;
}

// ============================================
// EXEMPLO 3: Inline Loading em Card
// ============================================
import { useState, useEffect } from 'react';
import GlobalLoader from '../components/GlobalLoader';

export function ProductCard({ productId }) {
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/products/${productId}`);
                const data = await response.json();
                setProduct(data);
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId]);

    return (
        <div className="card">
            {loading ? (
                <GlobalLoader
                    mode="inline"
                    size="md"
                    message="Carregando produto..."
                />
            ) : (
                <>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <p className="price">{product.price} MT</p>
                </>
            )}
        </div>
    );
}

// ============================================
// EXEMPLO 4: Loading em Botão de Submissão
// ============================================
export function SubmitOrderButton({ order }) {
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (response.ok) {
                alert('Pedido enviado com sucesso!');
            }
        } catch (error) {
            alert('Erro ao enviar pedido');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <button
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-button"
        >
            {submitting ? (
                <GlobalLoader mode="inline" size="sm" />
            ) : (
                'Enviar Pedido'
            )}
        </button>
    );
}

// ============================================
// EXEMPLO 5: Loading em Lista de Itens
// ============================================
export function OrdersList() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const loadOrders = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/orders');
                const data = await response.json();
                setOrders(data);
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, []);

    if (loading) {
        return (
            <div className="orders-container">
                <GlobalLoader
                    mode="inline"
                    size="lg"
                    message="Carregando pedidos..."
                />
            </div>
        );
    }

    if (orders.length === 0) {
        return <p>Nenhum pedido encontrado</p>;
    }

    return (
        <div className="orders-list">
            {orders.map(order => (
                <OrderCard key={order.id} order={order} />
            ))}
        </div>
    );
}

// ============================================
// EXEMPLO 6: Múltiplos Tipos de Loading
// ============================================
export function DashboardWithMultipleLoading() {
    const { showLoading, hideLoading } = useLoading();
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Loading fullscreen para dados iniciais
    useEffect(() => {
        const loadInitialData = async () => {
            showLoading(LOADING_TYPES.FULL, 'Carregando dashboard...');

            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                // Processar dados...
            } finally {
                hideLoading(LOADING_TYPES.FULL);
            }
        };

        loadInitialData();
    }, []);

    // Loading discrete para refresh automático
    useEffect(() => {
        const autoRefresh = setInterval(async () => {
            showLoading(LOADING_TYPES.BACKGROUND);

            try {
                // Atualizar dados em background
                const response = await fetch('/api/dashboard/stats');
                const data = await response.json();
                setStats(data);
            } finally {
                hideLoading(LOADING_TYPES.BACKGROUND);
            }
        }, 60000); // A cada 1 minuto

        return () => clearInterval(autoRefresh);
    }, []);

    // Loading inline para card específico
    const refreshStats = async () => {
        setLoadingStats(true);
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            setStats(data);
        } finally {
            setLoadingStats(false);
        }
    };

    return (
        <div className="dashboard">
            <div className="stats-card">
                {loadingStats ? (
                    <GlobalLoader mode="inline" size="md" message="Atualizando..." />
                ) : (
                    <StatsDisplay stats={stats} />
                )}
                <button onClick={refreshStats}>Atualizar</button>
            </div>
        </div>
    );
}

export default {
    NavigationExample,
    RealtimeDataExample,
    ProductCard,
    SubmitOrderButton,
    OrdersList,
    DashboardWithMultipleLoading
};
