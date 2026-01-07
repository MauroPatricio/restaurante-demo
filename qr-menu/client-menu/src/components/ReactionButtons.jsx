import { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { createClientReaction } from '../services/waiterCallAPI';
import './ReactionButtons.css';

export default function ReactionButtons({ tableId }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [lastReactionTime, setLastReactionTime] = useState(null);

    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

    const canReact = () => {
        if (!lastReactionTime) return true;
        const timeSinceLastReaction = Date.now() - lastReactionTime;
        return timeSinceLastReaction >= COOLDOWN_MS;
    };

    const handleReactionClick = (reactionType) => {
        if (!tableId) {
            alert('Mesa não identificada. Por favor, escaneie o QR code novamente.');
            return;
        }

        if (!canReact()) {
            const remainingMinutes = Math.ceil((COOLDOWN_MS - (Date.now() - lastReactionTime)) / 60000);
            alert(`Você já enviou uma avaliação. Aguarde ${remainingMinutes} minuto(s) para enviar outra.`);
            return;
        }

        setSelectedReaction(reactionType);
        setShowModal(true);
    };

    const handleSubmit = async (skipComment = false) => {
        if (!selectedReaction) return;

        setSubmitting(true);

        try {
            await createClientReaction(
                tableId,
                selectedReaction,
                skipComment ? '' : comment
            );

            setLastReactionTime(Date.now());
            setShowModal(false);
            setShowConfirmation(true);
            setComment('');
            setSelectedReaction(null);

            // Hide confirmation after 3 seconds
            setTimeout(() => {
                setShowConfirmation(false);
            }, 3000);
        } catch (error) {
            console.error('Failed to submit reaction:', error);
            alert('Erro ao enviar avaliação. Por favor, tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setComment('');
        setSelectedReaction(null);
    };

    if (!tableId) {
        return null;
    }

    const getRemainingCooldown = () => {
        if (!lastReactionTime || canReact()) return null;
        const remainingMinutes = Math.ceil((COOLDOWN_MS - (Date.now() - lastReactionTime)) / 60000);
        return remainingMinutes;
    };

    const remainingCooldown = getRemainingCooldown();

    return (
        <>
            {/* Reaction Buttons */}
            <div className="reaction-buttons-container">
                <div className="reaction-header">
                    <span className="reaction-title">Como está sendo atendido?</span>
                </div>
                <div className="reaction-buttons">
                    <button
                        onClick={() => handleReactionClick('satisfied')}
                        disabled={!!remainingCooldown}
                        className="reaction-btn satisfied"
                        aria-label="Satisfeito"
                    >
                        <ThumbsUp size={20} />
                        <span>Ótimo!</span>
                    </button>
                    <button
                        onClick={() => handleReactionClick('dissatisfied')}
                        disabled={!!remainingCooldown}
                        className="reaction-btn dissatisfied"
                        aria-label="Insatisfeito"
                    >
                        <ThumbsDown size={20} />
                        <span>Ruim</span>
                    </button>
                </div>
                {remainingCooldown && (
                    <div className="cooldown-message">
                        Você poderá avaliar novamente em {remainingCooldown} min
                    </div>
                )}
            </div>

            {/* Comment Modal */}
            {showModal && (
                <div className="reaction-modal-overlay" onClick={handleCloseModal}>
                    <div className="reaction-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleCloseModal}>
                            <X size={24} />
                        </button>

                        <div className="modal-header">
                            <div className={`modal-icon ${selectedReaction}`}>
                                {selectedReaction === 'satisfied' ? (
                                    <ThumbsUp size={32} />
                                ) : (
                                    <ThumbsDown size={32} />
                                )}
                            </div>
                            <h3 className="modal-title">
                                {selectedReaction === 'satisfied'
                                    ? 'Que bom que está gostando!'
                                    : 'Sentimos muito pela experiência'}
                            </h3>
                            <p className="modal-subtitle">
                                Gostaria de deixar um comentário? (opcional)
                            </p>
                        </div>

                        <div className="modal-body">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Deixe seu comentário aqui..."
                                maxLength={500}
                                rows={4}
                                className="comment-textarea"
                            />
                            <div className="char-count">
                                {comment.length}/500
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="btn-secondary"
                            >
                                Pular
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="btn-primary"
                            >
                                {submitting ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Confirmation */}
            {showConfirmation && (
                <div className="reaction-confirmation">
                    <div className="confirmation-content">
                        <span className="check-icon">✓</span>
                        <div>
                            <div className="confirmation-title">Avaliação Enviada!</div>
                            <div className="confirmation-message">
                                Obrigado pelo seu feedback
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
