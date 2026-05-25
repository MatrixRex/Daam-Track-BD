import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import ProductImage from './ProductImage';

export default function ItemHoverCard({ item, mousePos, sideRect, side = 'right', normTargets, stats }) {
    const [activeData, setActiveData] = useState(null);

    // Delay popup visibility but hide instantly on mouse leave (item === null)
    useEffect(() => {
        if (!item) {
            setActiveData(null);
            return;
        }

        const timer = setTimeout(() => {
            setActiveData({ item, stats, sideRect });
        }, 300); // 300ms hover delay

        return () => clearTimeout(timer);
    }, [item, stats, sideRect]);

    if (!activeData) return null;

    const { item: currentItem, stats: currentStats, sideRect: currentSideRect } = activeData;

    const cardWidth = 288;
    const cardHeight = 380;
    const gap = 15;
    const hoverItemOffset = 40; // Space to keep the hovered item visible

    let left = mousePos.x + 20;
    let top = mousePos.y;

    // 1. Vertical Positioning Logic: Anchor based on screen half
    if (mousePos.y < window.innerHeight / 2) {
        // Cursor in top half: card goes BELOW
        top = mousePos.y + hoverItemOffset;
    } else {
        // Cursor in bottom half: card goes ABOVE
        top = mousePos.y - cardHeight - hoverItemOffset;
    }

    // 2. Horizontal Positioning Logic
    if (currentSideRect) {
        const spaceOnRight = window.innerWidth - currentSideRect.right;
        const spaceOnLeft = currentSideRect.left;

        if (side === 'right') {
            // Priority 1: Right of the list
            if (spaceOnRight > cardWidth + gap) {
                left = currentSideRect.right + gap;
            } else {
                // Priority 2: Overlap the list, but NEVER overlap the chart (don't go left of sideRect.left)
                left = Math.max(currentSideRect.left, currentSideRect.right - cardWidth);
            }
        } else {
            // side === 'left' (e.g. Search Bar)
            // Priority 1: Left of the anchor
            if (spaceOnLeft > cardWidth + gap) {
                left = currentSideRect.left - cardWidth - gap;
            }
            // Priority 2: Right of the anchor
            else if (spaceOnRight > cardWidth + gap) {
                left = currentSideRect.right + gap;
            }
            // Priority 3: Overlap but stay within sideRect bounds if possible
            else {
                left = Math.max(10, currentSideRect.left);
            }
        }
    }

    // Final Guardrail: Keep within viewport bounds
    const clampedTop = Math.max(10, Math.min(top, window.innerHeight - cardHeight - 10));
    const clampedLeft = Math.max(10, Math.min(left, window.innerWidth - cardWidth - 10));

    const style = {
        top: clampedTop,
        left: clampedLeft,
    };

    const itemColor = currentStats?.color?.stroke || currentStats?.color;

    return (
        <div
            className="fixed z-[100] pointer-events-none transition-opacity duration-200"
            style={style}
        >
            <div className={clsx(
                "w-72 bg-muted rounded-2xl shadow-2xl border border-border overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-200"
            )}>
                {/* Image Section (With premium dynamic fallback) */}
                <ProductImage
                    item={currentItem}
                    color={itemColor}
                    className="h-48"
                    imgClassName="mix-blend-multiply dark:mix-blend-normal dark:brightness-110"
                    fallbackSize="text-4xl"
                    imagePadding="p-0"
                    imageBg="bg-background"
                    showBadge={true}
                    badgeClassName="absolute top-3 right-3 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm z-10"
                />

                {/* Content Section */}
                <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground leading-tight mb-1">
                        {currentItem.name}
                    </h3>
                    <div className="text-sm text-muted-foreground mb-4">
                        Per {currentItem.unit}
                    </div>

                    <div className="flex flex-col border-t border-border/30 pt-4 mt-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                                    {normTargets ? 'Normalized Price' : 'Current Price'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-2xl font-black text-primary">
                                        ৳{normTargets
                                            ? Math.round(getNormalizedPrice(currentStats?.current ?? currentItem.price, currentItem.unit, normTargets))
                                            : (currentStats?.current ?? currentItem.price)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        / {normTargets
                                            ? getTargetUnitLabel(parseUnit(currentItem.unit).type, normTargets[parseUnit(currentItem.unit).type], currentItem.unit)
                                            : currentItem.unit}
                                    </span>
                                </div>
                            </div>

                            {/* Price Change Chip */}
                            {currentStats && currentStats.change !== 0 && (
                                <div className={clsx(
                                    "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm",
                                    currentStats.change > 0 ? "bg-red-50 dark:bg-red-900/40 text-red-600 border border-red-100 dark:border-red-800/30" :
                                        "bg-primary/10 text-primary border border-border/30"
                                    )}>
                                    {currentStats.change > 0 ? '▲' : '▼'}
                                    ৳{normTargets
                                        ? Math.round(getNormalizedPrice(Math.abs(currentStats.change), currentItem.unit, normTargets))
                                        : Math.abs(currentStats.change)}
                                </div>
                            )}
                        </div>

                        {/* Range Row */}
                        {currentStats && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-border/60">L</div>
                                    <span className="text-xs font-bold text-foreground">
                                        ৳{normTargets ? Math.round(getNormalizedPrice(currentStats.min, currentItem.unit, normTargets)) : currentStats.min}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-[10px] font-black text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800/20">H</div>
                                    <span className="text-xs font-bold text-foreground">
                                        ৳{normTargets ? Math.round(getNormalizedPrice(currentStats.max, currentItem.unit, normTargets)) : currentStats.max}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary to-primary" />
            </div>
        </div>
    );
}
