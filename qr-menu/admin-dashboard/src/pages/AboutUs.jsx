import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Info, 
    Rocket, 
    ShieldCheck, 
    Cpu, 
    Globe, 
    Mail, 
    Phone, 
    Clock, 
    MapPin,
    CheckCircle2,
    MessagesSquare
} from 'lucide-react';

export default function AboutUs() {
    const { t } = useTranslation();

    const specializations = [
        t('about_us_spec_1'),
        t('about_us_spec_2'),
        t('about_us_spec_3'),
        t('about_us_spec_4'),
        t('about_us_spec_5'),
        t('about_us_spec_6'),
        t('about_us_spec_7')
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4">
                    <Info size={32} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Nhiquela Serviços e Consultoria, LDA
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                    {t('about_us_description_1')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                {/* Institutional Description */}
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('about_us_description_2')}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('about_us_description_3')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('about_us_description_4')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Our Specialization */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-500" size={24} />
                        {t('about_us_spec_title')}
                    </h2>
                    <ul className="space-y-4">
                        {specializations.map((spec, index) => (
                            <li key={index} className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <span>{spec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Contacts & Support Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Company Info */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Globe className="text-blue-500" size={20} />
                        {t('about_us_info_title')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500 dark:text-gray-500">{t('about_us_company')}</span>
                            <span className="font-medium text-gray-900 dark:text-white">Nhiquela Serviços e Consultoria, LDA</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="text-gray-400 mt-1" size={18} />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 dark:text-gray-500">{t('about_us_location')}</span>
                                <span className="text-gray-900 dark:text-white">{t('about_us_location_val')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Globe className="text-gray-400" size={18} />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 dark:text-gray-500">{t('about_us_website')}</span>
                                <a href="https://nhiquelaservicos.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    nhiquelaservicos.com
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Direct Contacts */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Phone className="text-blue-500" size={20} />
                        {t('about_us_contacts_title')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <MessagesSquare className="text-emerald-500" size={18} />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 dark:text-gray-500">{t('about_us_phone_whatsapp')}</span>
                                <a href="https://wa.me/258853600036" target="_blank" rel="noopener noreferrer" className="text-gray-900 dark:text-white font-medium hover:text-emerald-500 transition-colors">
                                    +258 85 360 0036
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="text-blue-500" size={18} />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 dark:text-gray-500">{t('about_us_email')}</span>
                                <a href="mailto:nhiquelaservicosconsultoria@gmail.com" className="text-gray-900 dark:text-white font-medium hover:text-blue-500 transition-colors">
                                    nhiquelaservicosconsultoria@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support Info */}
                <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Clock size={20} />
                        {t('about_us_support_title')}
                    </h3>
                    <p className="text-blue-50 mb-6 text-sm">
                        {t('about_us_support_desc')}
                    </p>
                    <div className="space-y-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-blue-200 uppercase tracking-wider">{t('about_us_support_availability')}</span>
                            <span className="font-bold">{t('about_us_support_24_7')}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-xs text-blue-200 uppercase tracking-wider block mb-2">{t('about_us_support_languages_title')}</span>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-white/10 rounded-md text-xs">{t('about_us_support_lang_pt')}</span>
                                <span className="px-2 py-1 bg-white/10 rounded-md text-xs">{t('about_us_support_lang_en')}</span>
                                <span className="px-2 py-1 bg-white/10 rounded-md text-xs">{t('about_us_support_lang_others')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-gray-500 dark:text-gray-400 italic text-sm max-w-2xl mx-auto">
                {t('about_us_objective')}
            </div>
        </div>
    );
}
