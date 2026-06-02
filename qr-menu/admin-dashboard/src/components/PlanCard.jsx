import React from 'react';
import { useTranslation } from 'react-i18next';

const CHECK_ICON = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ARROW_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8H13M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SPINNER = (
  <span className="sp-spinner" />
);

const PlanCard = ({ plan, isFeatured, onSelect, loading, currentPlanId }) => {
  const { t } = useTranslation();
  const { id, name, amountRaw, description, features, icon } = plan;
  const isCurrent = currentPlanId === id;

  // Calculate dynamic USD rate using 65 exchange rate
  const usdAmount = Math.round(amountRaw / 65);

  return (
    <div className={`sp-card${isFeatured ? ' featured' : ''}`}>
      {isFeatured && (
        <div className="sp-popular-badge">⭐ {t('sp_most_popular') || 'MAIS POPULAR'}</div>
      )}

      {/* Card Header */}
      <div className="sp-card-header">
        <div className="sp-plan-icon">{icon}</div>
        <h2 className="sp-plan-name">{name}</h2>
        <p className="sp-plan-desc">{description}</p>
      </div>

      {/* Pricing */}
      <div className="sp-pricing">
        <div className="sp-price-row">
          <span className="sp-currency">MT</span>
          <span className="sp-amount">{amountRaw.toLocaleString('pt-MZ')}</span>
          <span className="sp-period">{t('sp_per_month') || '/mês'}</span>
        </div>
        <div 
          className="sp-price-usd" 
          style={{ 
            fontSize: '0.88rem', 
            color: isFeatured ? 'rgba(255,255,255,0.85)' : '#64748b', 
            marginTop: '4px',
            fontWeight: '600'
          }}
        >
          {`$${usdAmount} USD ${t('sp_per_month') || '/mês'}`}
        </div>
        <p className="sp-price-note" style={{ marginTop: '8px' }}>
          {t('sp_billing_info') || 'Cobrado mensalmente · Sem contrato'}
        </p>
      </div>

      {/* Features */}
      <ul className="sp-features">
        {features.map((feat, idx) => (
          <li key={idx} className="sp-feature-item">
            <span className="sp-feature-check">{CHECK_ICON}</span>
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className="sp-cta-btn"
        onClick={onSelect}
        disabled={loading || isCurrent}
      >
        {loading ? (
          <>{SPINNER} {t('loading_processing') || 'A processar...'}</>
        ) : isCurrent ? (
          `✓ ${t('current_plan') || 'Plano Activo'}`
        ) : (
          <>
            {t(`sp_select_${id}`) || `Selecionar ${name}`} {ARROW_ICON}
          </>
        )}
      </button>
    </div>
  );
};

export default PlanCard;
