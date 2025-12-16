import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'en', label: '🇬🇧 EN' },
        { code: 'pt', label: '🇲🇿 PT' },
        { code: 'fr', label: '🇫🇷 FR' },
        { code: 'es', label: '🇪🇸 ES' },
    ];

    return (
        <div className="language-switcher" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Globe size={18} className="text-gray" />
            <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    padding: '4px'
                }}
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
