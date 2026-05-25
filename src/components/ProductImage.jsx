import React, { useState } from 'react';
import { DATA_BASE_URL } from '../config';
import clsx from 'clsx';

// Pre-defined mapping from solid app colors to beautiful premium linear gradients
const PALETTE_GRADIENTS = {
    '#3b82f6': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
    '#10b981': 'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Emerald
    '#f59e0b': 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
    '#ef4444': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // Red
    '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
    '#ec4899': 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
    '#06b6d4': 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', // Cyan
    '#84cc16': 'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)', // Lime
    '#f97316': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', // Orange
    '#6366f1': 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Indigo
    '#14b8a6': 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', // Teal
    '#a855f7': 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', // Violet
};

/**
 * Generates a stable, vibrant, and professional linear gradient.
 * If a custom object color is provided, it uses the palette gradient mapping.
 * Otherwise, it falls back to a deterministic gradient based on the product name.
 */
function getProductGradient(name, color) {
    if (color) {
        const normalized = color.toLowerCase();
        if (PALETTE_GRADIENTS[normalized]) {
            return {
                background: PALETTE_GRADIENTS[normalized],
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            };
        }
        
        // Dynamic fallback gradient if standard color is not in the palette
        return {
            background: `linear-gradient(135deg, ${color} 0%, rgba(0,0,0,0.2) 100%), ${color}`,
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        };
    }

    if (!name) {
        return {
            background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
            color: '#ffffff'
        };
    }
    
    // Hash function to get a stable integer for the product name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    const index = hash % 8;
    
    // Curated premium vibrant gradients (modern linear gradients matching warm/cool schemes)
    const gradients = [
        'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', // Indigo / Rose-Pink
        'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan / Blue
        'linear-gradient(135deg, #10b981 0%, #0f766e 100%)', // Emerald / Deep Teal
        'linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)', // Amber / Rose
        'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Indigo / Violet
        'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', // Orange / Red
        'linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)', // Sky / Royal Blue
        'linear-gradient(135deg, #fb7185 0%, #c084fc 100%)', // Coral-Rose / Lavender
    ];
    
    return {
        background: gradients[index],
        color: '#ffffff',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    };
}

export default function ProductImage({
    item,
    color,                      // Object color from list (if present)
    className = "",
    imgClassName = "",
    fallbackSize = "text-base", // e.g. text-xs, text-xl, text-4xl, text-6xl
    showBadge = false,
    badgeClassName = "",
    imagePadding = "p-0",       // Padding when image is loaded
    imageBg = "bg-background",  // Background color when image is loaded
    children,                   // Custom overlays or overlays
}) {
    const [prevItemKey, setPrevItemKey] = useState('');
    const [hasError, setHasError] = useState(false);

    const currentItemKey = item ? `${item.name}-${item.image}` : '';
    if (currentItemKey !== prevItemKey) {
        setPrevItemKey(currentItemKey);
        setHasError(false);
    }

    if (!item) return null;

    const firstLetter = (item.name ? (item.name.match(/[a-zA-Z0-9]/) || [item.name.charAt(0)])[0] : '').toUpperCase();
    const hasImage = item.image && !hasError;

    return (
        <div 
            className={clsx(
                "relative flex items-center justify-center overflow-hidden",
                hasImage ? `${imagePadding} ${imageBg}` : "p-0",
                className
            )}
        >
            {hasImage ? (
                <img
                    src={`${DATA_BASE_URL}/images/${item.image}`}
                    alt={item.name}
                    className={clsx("w-full h-full object-contain", imgClassName)}
                    onError={() => setHasError(true)}
                />
            ) : (
                <div
                    style={getProductGradient(item.name, color)}
                    className={clsx(
                        "w-full h-full flex items-center justify-center font-black select-none tracking-tight animate-fade-in uppercase",
                        fallbackSize
                    )}
                >
                    {firstLetter}
                </div>
            )}

            {showBadge && item.category && (
                <div className={clsx(badgeClassName)}>
                    {item.category}
                </div>
            )}

            {children}
        </div>
    );
}
