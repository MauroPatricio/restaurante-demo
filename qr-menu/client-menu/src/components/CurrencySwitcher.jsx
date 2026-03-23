import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { getCurrencySymbol } from '../utils/currencyUtils';

const CurrencySwitcher = () => {
    const { currency, changeCurrency } = useCurrency();

    const currencies = [
        { code: 'MZN', label: getCurrencySymbol('MZN'), flag: '🇲🇿' },
        { code: 'USD', label: 'USD', flag: '🇺🇸' },
        { code: 'EUR', label: 'EUR', flag: '🇪🇺' },
        { code: 'ZAR', label: 'ZAR', flag: '🇿🇦' },
        { code: 'GBP', label: 'GBP', flag: '🇬🇧' },
    ];

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {currencies.map((curr) => (
                <button
                    key={curr.code}
                    onClick={() => changeCurrency(curr.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                        ${currency === curr.code
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
                        }`}
                >
                    <span>{curr.flag}</span>
                    <span>{curr.label}</span>
                </button>
            ))}
        </div>
    );
};

export default CurrencySwitcher;
