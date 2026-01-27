import React from 'react';

/**
 * SkeletonCard - Skeleton loader for card-like content
 * Used during initial page load to maintain layout and visual context
 */
export const SkeletonCard = ({ height = '200px', className = '' }) => (
    <div
        className={`bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse ${className}`}
        style={{ height }}
    >
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
    </div>
);

/**
 * SkeletonGrid - Grid of skeleton cards
 * Perfect for dashboard KPIs, product listings, table grids
 */
export const SkeletonGrid = ({
    items = 6,
    columns = 3,
    gap = '24px',
    height = '160px'
}) => (
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap
        }}
    >
        {Array.from({ length: items }).map((_, index) => (
            <SkeletonCard key={index} height={height} />
        ))}
    </div>
);

/**
 * SkeletonList - List of skeleton items
 * Perfect for order lists, user lists, table lists
 */
export const SkeletonList = ({
    items = 5,
    height = '80px',
    gap = '12px'
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {Array.from({ length: items }).map((_, index) => (
            <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse flex items-center gap-4"
                style={{ height }}
            >
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        ))}
    </div>
);

/**
 * SkeletonTable - Table skeleton with rows
 * Perfect for data tables, reports
 */
export const SkeletonTable = ({
    rows = 8,
    columns = 5
}) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="grid gap-4 animate-pulse" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
            </div>
        </div>
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="border-b border-gray-100 dark:border-gray-700/50 p-4 last:border-0">
                <div className="grid gap-4 animate-pulse" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={colIndex} className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

/**
 * PageContainer - Wrapper with optional skeleton loading
 * Maintains page structure during initial load
 */
export const PageContainer = ({
    loading,
    children,
    skeletonType = 'grid',
    skeletonProps = {}
}) => {
    if (loading) {
        switch (skeletonType) {
            case 'grid':
                return <SkeletonGrid {...skeletonProps} />;
            case 'list':
                return <SkeletonList {...skeletonProps} />;
            case 'table':
                return <SkeletonTable {...skeletonProps} />;
            default:
                return <SkeletonGrid {...skeletonProps} />;
        }
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
