import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlobalLoaderProps {
    mode?: 'fullscreen' | 'inline';
    size?: 'small' | 'large' | number;
    message?: string;
    color?: string;
}

/**
 * GlobalLoader - Componente unificado de loading para mobile
 * Inspirado no estilo visual da área do Garçom
 * 
 * @param {Object} props
 * @param {'fullscreen' | 'inline'} props.mode - Modo de exibição do loader
 * @param {'small' | 'large'} props.size - Tamanho do indicador
 * @param {string} props.message - Mensagem opcional a exibir
 * @param {string} props.color - Cor do loader (padrão: #2563eb)
 */
const GlobalLoader: React.FC<GlobalLoaderProps> = ({
    mode = 'inline',
    size = 'large',
    message = '',
    color = '#2563eb'
}) => {
    // Modo Fullscreen - Overlay completo com blur
    if (mode === 'fullscreen') {
        return (
            <View style={styles.fullscreenContainer}>
                <BlurView intensity={20} style={styles.blurView}>
                    <View style={styles.fullscreenContent}>
                        <ActivityIndicator
                            size={size}
                            color={color}
                            style={styles.spinner}
                        />

                        {message ? (
                            <>
                                <Text style={styles.fullscreenTitle}>{message}</Text>
                                <Text style={styles.fullscreenSubtitle}>Por favor, aguarde...</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.fullscreenTitle}>A processar...</Text>
                                <Text style={styles.fullscreenSubtitle}>
                                    Por favor, aguarde enquanto processamos sua solicitação.
                                </Text>
                            </>
                        )}
                    </View>
                </BlurView>
            </View>
        );
    }

    // Modo Inline - Loading embutido
    return (
        <View style={[styles.inlineContainer, message && styles.inlineWithMessage]}>
            <ActivityIndicator
                size={size}
                color={color}
            />

            {message && (
                <Text style={styles.inlineMessage}>{message}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Fullscreen styles
    fullscreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
    blurView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    fullscreenContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        maxWidth: 320,
        width: '90%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 25 },
                shadowOpacity: 0.25,
                shadowRadius: 50,
            },
            android: {
                elevation: 25,
            },
        }),
    },
    spinner: {
        marginBottom: 16,
    },
    fullscreenTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    fullscreenSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Inline styles
    inlineContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    inlineWithMessage: {
        padding: 20,
        gap: 12,
    },
    inlineMessage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
        marginTop: 12,
    },
});

export default GlobalLoader;
