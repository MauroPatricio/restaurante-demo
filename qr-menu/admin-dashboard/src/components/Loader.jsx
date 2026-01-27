import GlobalLoader from './GlobalLoader';

/**
 * DEPRECATED: Use GlobalLoader diretamente
 * Wrapper de compatibilidade que mapeia props antigas para GlobalLoader
 * 
 * Variants:
 * - page: Fullscreen overlay (for route/page loading) → mode="fullscreen"
 * - section: Container-based loader (for cards/panels) → mode="inline"
 * - inline: Inline loader (for buttons) → mode="inline"
 * 
 * Sizes: small (20px), medium (40px), large (60px)
 */
export default function Loader({
    variant = 'section',
    size = 'medium',
    color = '#2563eb', // Usa a cor padrão do Garçom
    message = null
}) {
    // Mapear variant antigo para mode do GlobalLoader
    const modeMap = {
        'page': 'fullscreen',
        'section': 'inline',
        'inline': 'inline'
    };

    // Mapear tamanhos antigos para novos
    const sizeMap = {
        'small': 20,
        'medium': 40,
        'large': 60
    };

    const mode = modeMap[variant] || 'inline';
    const iconSize = sizeMap[size] || 40;

    return (
        <GlobalLoader
            mode={mode}
            size={iconSize}
            color={color}
            message={message}
        />
    );
}
