import React from 'react';
import { DATA_BASE_URL } from '../config';
import clsx from 'clsx';

export default function ItemHoverCard({ item, mousePos, sideRect, side = 'right' }) {
    if (!item) return null;

    const cardWidth = 288; // Default width of w-72
    const cardHeight = 380; // Approximate height
    const gap = 15;

    let left = mousePos.x + 20;
    let top = mousePos.y + 10;

    if (sideRect) {
        // Horizontal: Show beside the anchor
        const spaceOnRight = window.innerWidth - sideRect.right;
        const spaceOnLeft = sideRect.left;

        if (side === 'right') {
            if (spaceOnRight > cardWidth + gap) {
                // Show on the right
                left = sideRect.right + gap;
            } else {
                // Not enough space on right, and we want to avoid the left (chart)
                // So we overlap the anchor list itself
                left = Math.max(10, sideRect.right - cardWidth);
            }
        } else {
            // side === 'left' preference (Search Bar)
            if (spaceOnLeft > cardWidth + gap) {
                left = sideRect.left - cardWidth - gap;
            } else {
                left = sideRect.right + gap;
            }
        }

        // Vertical: Track mouse but center the card vertically on cursor
        top = mousePos.y - (cardHeight / 2);
    }

    // Guardrail: Keep within viewport bounds
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
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[#7A9F7A] dark:bg-[#6B5B95] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
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

                    <div className="flex items-end justify-between border-t border-[#D4E6DC]/30 dark:border-[#4A3F6B]/30 pt-4 mt-2">
                        <div className="flex flex-col">
                            <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95] uppercase font-bold tracking-tighter">Current Price</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-[#7A9F7A] dark:text-[#9D8EC9]">৳{item.price}</span>
                                <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95]">/ {item.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#7A9F7A] via-[#97B897] to-[#7A9F7A] dark:from-[#6B5B95] dark:via-[#9D8EC9] dark:to-[#6B5B95]" />
            </div>
        </div>
    );
}
