import React from 'react';
import { DATA_BASE_URL } from '../config';
import clsx from 'clsx';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';

export default function ItemHoverCard({ item, mousePos, sideRect, side = 'right', normTargets, stats }) {
    if (!item) return null;

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
    if (sideRect) {
        const spaceOnRight = window.innerWidth - sideRect.right;
        const spaceOnLeft = sideRect.left;

        if (side === 'right') {
            // Priority 1: Right of the list
            if (spaceOnRight > cardWidth + gap) {
                left = sideRect.right + gap;
            } else {
                // Priority 2: Overlap the list, but NEVER overlap the chart (don't go left of sideRect.left)
                left = Math.max(sideRect.left, sideRect.right - cardWidth);
            }
        } else {
            // side === 'left' (e.g. Search Bar)
            // Priority 1: Left of the anchor
            if (spaceOnLeft > cardWidth + gap) {
                left = sideRect.left - cardWidth - gap;
            }
            // Priority 2: Right of the anchor
            else if (spaceOnRight > cardWidth + gap) {
                left = sideRect.right + gap;
            }
            // Priority 3: Overlap but stay within sideRect bounds if possible
            else {
                left = Math.max(10, sideRect.left);
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

    return (
        <div
            className="fixed z-[100] pointer-events-none transition-opacity duration-200"
            style={style}
        >
            <div className={clsx(
                "w-72 bg-[#FFFDF8] dark:bg-[#2A2442] rounded-2xl shadow-2xl border border-[#D4E6DC] dark:border-[#4A3F6B] overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-200"
            )}>
                {/* Image Section */}
                <div className="relative h-48 bg-[#F5E6D3] dark:bg-[#1E1A2E] flex items-center justify-center p-6">
                    <img
                        src={`${DATA_BASE_URL}/images/${item.image}`}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110 drop-shadow-xl"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="hidden w-full h-full items-center justify-center text-[#8B7E6B] dark:text-[#6B5B95] text-4xl font-bold">
                        {item.name.charAt(0)}
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[#7A9F7A] dark:bg-[#6B5B95] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                        {item.category}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-5">
                    <h3 className="text-lg font-bold text-[#5C5247] dark:text-white leading-tight mb-1">
                        {item.name}
                    </h3>
                    <div className="text-sm text-[#8B7E6B] dark:text-[#B8AED0] mb-4">
                        Per {item.unit}
                    </div>

                    <div className="flex flex-col border-t border-[#D4E6DC]/30 dark:border-[#4A3F6B]/30 pt-4 mt-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95] uppercase font-bold tracking-tighter">
                                    {normTargets ? 'Normalized Price' : 'Current Price'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-2xl font-black text-[#7A9F7A] dark:text-[#9D8EC9]">
                                        ৳{normTargets
                                            ? Math.round(getNormalizedPrice(stats?.current ?? item.price, item.unit, normTargets))
                                            : (stats?.current ?? item.price)}
                                    </span>
                                    <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95]">
                                        / {normTargets
                                            ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
                                            : item.unit}
                                    </span>
                                </div>
                            </div>

                            {/* Price Change Chip */}
                            {stats && stats.change !== 0 && (
                                <div className={clsx(
                                    "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm",
                                    stats.change > 0 ? "bg-red-50 dark:bg-red-900/40 text-red-600 border border-red-100 dark:border-red-800/30" :
                                        "bg-[#D4E6DC] dark:bg-green-900/40 text-[#4A6B4A] border border-[#D4E6DC] dark:border-green-800/30"
                                )}>
                                    {stats.change > 0 ? '▲' : '▼'}
                                    ৳{normTargets
                                        ? Math.round(getNormalizedPrice(Math.abs(stats.change), item.unit, normTargets))
                                        : Math.abs(stats.change)}
                                </div>
                            )}
                        </div>

                        {/* Range Row */}
                        {stats && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded bg-[#D4E6DC]/40 dark:bg-green-900/20 flex items-center justify-center text-[10px] font-black text-[#4A6B4A] dark:text-green-400 border border-[#D4E6DC]/60 dark:border-green-800/20">L</div>
                                    <span className="text-xs font-bold text-[#5C5247] dark:text-white">
                                        ৳{normTargets ? Math.round(getNormalizedPrice(stats.min, item.unit, normTargets)) : stats.min}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-[10px] font-black text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800/20">H</div>
                                    <span className="text-xs font-bold text-[#5C5247] dark:text-white">
                                        ৳{normTargets ? Math.round(getNormalizedPrice(stats.max, item.unit, normTargets)) : stats.max}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#7A9F7A] via-[#97B897] to-[#7A9F7A] dark:from-[#6B5B95] dark:via-[#9D8EC9] dark:to-[#6B5B95]" />
            </div>
        </div>
    );
}
