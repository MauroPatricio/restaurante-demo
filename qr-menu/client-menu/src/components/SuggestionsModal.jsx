import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Plus, ChefHat } from 'lucide-react';

const SuggestionsModal = ({ 
    item, 
    suggestions, 
    loading, 
    isOpen, 
    onClose, 
    onAdd, 
    formatPrice, 
    currency,
    t 
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                >
                    {/* Header */}
                    <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                <Sparkles className="text-amber-500" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                    {t('item_unavailable_title') || 'Ops! Este item acabou'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('item_unavailable_desc', { name: item?.name }) || `O ${item?.name} não está disponível no momento. Que tal estas sugestões?`}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-none">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-400 font-medium">Buscando as melhores alternativas...</p>
                            </div>
                        ) : suggestions.length > 0 ? (
                            <div className="grid gap-4">
                                {suggestions.map((sug, idx) => (
                                    <motion.div
                                        key={sug._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl flex gap-4 border border-gray-100 dark:border-gray-700/50 group hover:border-primary-500/30 transition-all"
                                    >
                                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700 relative">
                                            {(sug.imageUrl || sug.image || sug.photo) ? (
                                                <img 
                                                    src={sug.imageUrl || sug.image || sug.photo} 
                                                    alt={sug.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <ChefHat size={24} />
                                                </div>
                                            )}
                                            {sug.popular && (
                                                <div className="absolute top-1 left-1 bg-yellow-400 text-[8px] font-black px-1 rounded-md text-yellow-900 shadow-sm">
                                                    TOP
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white text-base">{sug.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{sug.description}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-black text-primary-600 dark:text-primary-400">
                                                    {formatPrice(sug.price, sug.currency || currency)}
                                                </span>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => onAdd(sug)}
                                                    className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                                                >
                                                    <Plus size={14} strokeWidth={3} /> {t('add_to_cart') || 'Adicionar'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400">Não encontramos outras opções no momento.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/30 flex justify-center">
                        <button 
                            onClick={onClose}
                            className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            {t('back_to_menu') || 'Voltar ao menu'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SuggestionsModal;
