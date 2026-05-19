import React from 'react';
import GlobalLoader from './GlobalLoader';

/**
 * SkeletonCard - Replaced with premium central GlobalLoader
 */
export const SkeletonCard = ({ height = '200px', className = '' }) => (
    <div 
        style={{ 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'white', 
            borderRadius: '24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
        }} 
        className={className}
    >
        <GlobalLoader mode="inline" size="sm" />
    </div>
);

/**
 * SkeletonGrid - Replaced with premium central GlobalLoader
 */
export const SkeletonGrid = ({
    items = 6,
    columns = 3,
    gap = '24px',
    height = '160px'
}) => (
    <div 
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 40px', 
            background: 'white', 
            borderRadius: '32px', 
            minHeight: height, 
            width: '100%',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
        }}
    >
        <GlobalLoader mode="inline" size="lg" />
    </div>
);

/**
 * SkeletonList - Replaced with premium central GlobalLoader
 */
export const SkeletonList = ({
    items = 5,
    height = '80px',
    gap = '12px'
}) => (
    <div 
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 40px', 
            background: 'white', 
            borderRadius: '32px', 
            minHeight: height, 
            width: '100%',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
        }}
    >
        <GlobalLoader mode="inline" size="lg" />
    </div>
);

/**
 * SkeletonTable - Replaced with premium central GlobalLoader
 */
export const SkeletonTable = ({
    rows = 8,
    columns = 5
}) => (
    <div 
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '80px 40px', 
            background: 'white', 
            borderRadius: '32px', 
            width: '100%',
            border: '1px solid #f1f5f9',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
        }}
    >
        <GlobalLoader mode="inline" size="lg" />
    </div>
);

/**
 * PageContainer - Centered unifed loader container
 */
export const PageContainer = ({
    loading,
    children,
    skeletonType = 'grid',
    skeletonProps = {}
}) => {
    if (loading) {
        return (
            <div 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '60vh', 
                    width: '100%',
                    background: 'white',
                    borderRadius: '32px',
                    border: '1px solid #f1f5f9'
                }}
            >
                <GlobalLoader mode="inline" size="lg" />
            </div>
        );
    }

    return <>{children}</>;
};

export default {
    SkeletonCard,
    SkeletonGrid,
    SkeletonList,
    SkeletonTable,
    PageContainer
};
