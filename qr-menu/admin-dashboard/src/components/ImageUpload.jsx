import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';

const ImageUpload = ({
    onImageUpload,
    currentImage = '',
    onRemove,
    maxSize = 5242880, // 5MB
    accept = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp']
    }
}) => {
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
        setError('');

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-too-large') {
                setError('File size exceeds 5MB limit');
            } else if (rejection.errors[0]?.code === 'file-invalid-type') {
                setError('Invalid file type. Only JPG, PNG, and WebP are allowed');
            } else {
                setError('File upload failed');
            }
            return;
        }

        const file = acceptedFiles[0];
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload file
        setUploading(true);
        setProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 100);

            const result = await onImageUpload(file);

            clearInterval(progressInterval);
            setProgress(100);

            setTimeout(() => {
                setProgress(0);
                setUploading(false);
            }, 500);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload image');
            setPreview(currentImage);
            setUploading(false);
            setProgress(0);
        }
    }, [onImageUpload, currentImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        disabled: uploading
    });

    const handleRemove = () => {
        setPreview('');
        setError('');
        if (onRemove) onRemove();
    };

    return (
        <div style={{ width: '100%' }}>
            {preview ? (
                <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{
                        width: '100%',
                        height: '300px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid #e2e8f0',
                        position: 'relative'
                    }}>
                        <img
                            src={preview}
                            alt="Preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        {uploading && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                <Loader size={32} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                                <div style={{ width: '80%', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: '#10b981',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <p style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                    Uploading... {progress}%
                                </p>
                            </div>
                        )}
                    </div>
                    {!uploading && (
                        <button
                            onClick={handleRemove}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    style={{
                        border: `2px dashed ${isDragActive ? '#3b82f6' : '#cbd5e1'}`,
                        borderRadius: '12px',
                        padding: '48px 24px',
                        textAlign: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        background: isDragActive ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.2s',
                        opacity: uploading ? 0.6 : 1
                    }}
                >
                    <input {...getInputProps()} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: isDragActive ? '#3b82f6' : '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            {uploading ? (
                                <Loader size={32} color={isDragActive ? 'white' : '#64748b'} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Upload size={32} color={isDragActive ? 'white' : '#64748b'} />
                            )}
                        </div>
                        <div>
                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                                {isDragActive ? 'Drop image here' : 'Drag & drop image here'}
                            </p>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                                or click to browse
                            </p>
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                                JPG, PNG, WebP • Max 5MB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <X size={16} />
                    {error}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ImageUpload;
