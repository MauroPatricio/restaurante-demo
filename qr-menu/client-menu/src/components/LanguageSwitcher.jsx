import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
    ];

    const toggleLanguage = (code) => {
        i18n.changeLanguage(code);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                        ${i18n.language === lang.code
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <span>{lang.flag}</span>
                    <span>{lang.code.toUpperCase()}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
