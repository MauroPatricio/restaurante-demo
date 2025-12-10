import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert
} from 'react-native';
import { feedbackAPI } from '../services/api';

const EMOTIONS = [
    { id: 'love', emoji: '😍', label: 'Love it' },
    { id: 'happy', emoji: '😊', label: 'Happy' },
    { id: 'neutral', emoji: '😐', label: 'Okay' },
    { id: 'sad', emoji: '😞', label: 'Sad' },
    { id: 'angry', emoji: '😠', label: 'Angry' },
];

export default function FeedbackScreen({ route, navigation }) {
    const { orderId } = route.params;
    const [selectedEmotions, setSelectedEmotions] = useState([]);
    const [rating, setRating] = useState(0);

    const toggleEmotion = (emotionId) => {
        if (selectedEmotions.includes(emotionId)) {
            setSelectedEmotions(selectedEmotions.filter(e => e !== emotion Id));
        } else {
            setSelectedEmotions([...selectedEmotions, emotionId]);
        }
    };

    const handleSubmit = async () => {
        if (selectedEmotions.length === 0 || rating === 0) {
            Alert.alert('Incomplete', 'Please select emotions and rating');
            return;
        }

        try {
            await feedbackAPI.submit({
                order: orderId,
                emotions: selectedEmotions,
                rating,
            });
            Alert.alert('Thank you!', 'Your feedback has been submitted');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to submit feedback');
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>How was your experience?</Text>

                {/* Emotions */}
                <View style={styles.emotionsContainer}>
                    {EMOTIONS.map((emotion) => (
                        <TouchableOpacity
                            key={emotion.id}
                            style={[
                                styles.emotionButton,
                                selectedEmotions.includes(emotion.id) && styles.emotionButtonActive,
                            ]}
                            onPress={() => toggleEmotion(emotion.id)}
                        >
                            <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                            <Text style={styles.emotionLabel}>{emotion.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stars Rating */}
                <Text style={styles.ratingTitle}>Overall Rating</Text>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                        >
                            <Text style={styles.star}>
                                {star <= rating ? '⭐' : '☆'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                >
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 32,
    },
    emotionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 40,
    },
    emotionButton: {
        width: 90,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emotionButtonActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    emotionEmoji: {
        fontSize: 40,
        marginBottom: 8,
    },
    emotionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    ratingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 16,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 40,
    },
    star: {
        fontSize: 48,
    },
    submitButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
