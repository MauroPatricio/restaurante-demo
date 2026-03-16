import { useRef, useCallback } from 'react';

/**
 * Hook para reproduzir sons de notificação
 * @param {string} soundPath - Caminho para o arquivo de som
 * @returns {Object} - Funções para controlar o som
 */
export const useSound = (soundPath) => {
    const audioRef = useRef(null);

    // Inicializar o áudio
    const initAudio = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(soundPath);
            audioRef.current.preload = 'auto';
        }
        return audioRef.current;
    }, [soundPath]);

    // Reproduzir o som
    const play = useCallback(async () => {
        try {
            const audio = initAudio();
            audio.currentTime = 0; // Reset para o início
            await audio.play();

        } catch (error) {
            console.warn('⚠️ Erro ao reproduzir som:', error);
            // Silenciar erro se o usuário não interagiu com a página ainda
            // (browsers bloqueiam autoplay de áudio)
        }
    }, [initAudio, soundPath]);

    // Parar o som
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);

    // Ajustar volume (0.0 a 1.0)
    const setVolume = useCallback((volume) => {
        const audio = initAudio();
        audio.volume = Math.max(0, Math.min(1, volume));
    }, [initAudio]);

    return { play, stop, setVolume };
};

export default useSound;
