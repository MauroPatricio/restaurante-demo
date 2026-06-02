import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { subscriptionAPI } from '../services/api';
import PlanCard from '../components/PlanCard';
import { Shield, Zap, Crown, ArrowLeft, CheckCircle2 } from 'lucide-react';
import './subscription_plans.css';

export default function SubscriptionPlans() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [successPlan, setSuccessPlan] = useState(null);

  const plans = [
    {
      id: 'starter',
      name: t('sp_starter_name') || 'Starter',
      amountRaw: 4200,
      icon: <Shield size={22} />,
      description: t('sp_starter_desc') || 'Ideal para pequenos restaurantes que querem começar a digitalizar operações.',
      features: [
        t('sp_feat_qr_menu') || 'QR Menu digital',
        t('sp_feat_tables') || 'Gestão de mesas',
        t('sp_feat_digital_orders') || 'Pedidos digitais',
        t('sp_feat_cash_basic') || 'Fecho de caixa básico',
        t('sp_feat_simple_reports') || 'Relatórios simples',
      ],
      highlighted: false,
    },
    {
      id: 'pro',
      name: t('sp_pro_name') || 'Pro',
      amountRaw: 8500,
      icon: <Zap size={22} />,
      description: t('sp_pro_desc') || 'Para restaurantes em crescimento que precisam de controlo total das operações.',
      features: [
        t('sp_feat_all_starter') || 'Tudo do Starter',
        t('sp_feat_stock_complete') || 'Controlo de Stock completo',
        t('sp_feat_advanced_reports') || 'Relatórios avançados',
        t('sp_feat_coupons') || 'Cupões de desconto',
        t('sp_feat_feedback') || 'Feedback de clientes',
        t('sp_feat_dashboard_exec') || 'Dashboard executivo',
        t('sp_feat_priority_support') || 'Suporte prioritário',
      ],
      highlighted: true,
    },
    {
      id: 'premium',
      name: t('sp_premium_name') || 'Premium',
      amountRaw: 12000,
      icon: <Crown size={22} />,
      description: t('sp_premium_desc') || 'A solução completa para cadeias e restaurantes de alta performance.',
      features: [
        t('sp_feat_all_pro') || 'Tudo do Pro',
        t('sp_feat_multi_branch') || 'Gestão de múltiplas filiais',
        t('sp_feat_accounting_fiscal') || 'Módulo contabilístico e fiscal',
        t('sp_feat_advanced_analytics') || 'Analytics avançado com IA',
        t('sp_feat_room_service') || 'Serviço de quartos',
        t('sp_feat_dedicated_consultancy') || 'Consultoria dedicada',
        t('sp_feat_guaranteed_sla') || 'SLA garantido',
      ],
      highlighted: false,
    },
  ];

  // Determine current plan id from subscription
  const currentPlanId = subscription?.plan || subscription?.planId || null;

  const handleSelectPlan = async (planId) => {
    if (loadingPlan) return;
    setLoadingPlan(planId);
    setSuccessPlan(null);

    try {
      await subscriptionAPI.createPayment({ planId });
      await refreshSubscription();
      setSuccessPlan(planId);

      // After brief success animation, redirect to subscription management
      setTimeout(() => {
        navigate('/dashboard/subscription');
      }, 2000);
    } catch (err) {
      console.error('Plan selection failed:', err);
      alert(t('sp_error_select') || 'Falha ao selecionar o plano. Por favor, tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-badge">
          <Zap size={14} />
          {t('sp_badge') || 'Planos & Preços'}
        </div>

        <h1 className="sp-title">
          {t('sp_title_1') || 'Escolha o plano'}{' '}
          <span>{t('sp_title_2') || 'ideal para o seu restaurante'}</span>
        </h1>

        <p className="sp-subtitle">
          {t('sp_subtitle') || 'Aumente o controlo, reduza perdas e maximize o lucro com o plano certo. Todos os planos incluem suporte técnico e actualizações.'}
        </p>
      </div>

      {/* Current plan notice */}
      {currentPlanId && (
        <div className="sp-current-plan-banner">
          <CheckCircle2 size={18} />
          {t('sp_current_plan_notice', { plan: currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1) }) ||
            `O seu plano actual é ${currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}`}
        </div>
      )}

      {/* Success feedback */}
      {successPlan && (
        <div className="sp-current-plan-banner" style={{ borderColor: '#4ade80', marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          {t('sp_success') || 'Plano seleccionado com sucesso! A redirecionar...'}
        </div>
      )}

      {/* Plans Grid */}
      <div className="sp-grid">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isFeatured={plan.highlighted}
            onSelect={() => handleSelectPlan(plan.id)}
            loading={loadingPlan === plan.id}
            currentPlanId={currentPlanId}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="sp-footer">
        <span>{t('sp_footer_cancel') || 'Cancele a qualquer momento'}</span>
        <span className="sp-footer-dot" />
        <span>{t('sp_footer_no_contract') || 'Sem contrato de fidelização'}</span>
        <span className="sp-footer-dot" />
        <span>{t('sp_footer_support') || 'Suporte 24/7 incluído'}</span>
      </div>

      {/* Back to subscription management */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => navigate('/dashboard/subscription')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            padding: '8px 16px',
            borderRadius: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={16} />
          {t('sp_back_to_subscription') || 'Voltar à gestão de subscrição'}
        </button>
      </div>
    </div>
  );
}
