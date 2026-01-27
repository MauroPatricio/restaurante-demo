import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * SubmitButton - Button with inline loading state
 * Non-blocking, provides immediate feedback during form submission
 * 
 * Usage:
 *   <SubmitButton loading={submitting} onClick={handleSubmit}>
 *     Save Changes
 *   </SubmitButton>
 */
export const SubmitButton = ({
    loading = false,
    disabled = false,
    onClick,
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    className = '',
    ...props
}) => {
    const baseClasses = 'rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2';

    const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30',
    };

    const sizeClasses = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-6 py-4 text-lg',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`
                ${baseClasses}
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
                    {children}
                </>
            )}
        </button>
    );
};

/**
 * InlineLoader - Small inline spinner for inline loading states
 * Perfect for small areas, badges, or inline text
 */
export const InlineLoader = ({
    size = 16,
    color = '#2563eb',
    message,
    className = ''
}) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <Loader2
            size={size}
            style={{ color }}
            className="animate-spin"
        />
        {message && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
                {message}
            </span>
        )}
    </div>
);

export default {
    SubmitButton,
    InlineLoader
};
