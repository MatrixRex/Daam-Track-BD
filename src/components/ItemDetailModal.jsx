import React from 'react';
import { DATA_BASE_URL } from '../config';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function ItemDetailModal({ item, onClose }) {
    if (!item) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-sm bg-[#FFFDF8] dark:bg-[#2A2442] rounded-3xl shadow-2xl border border-[#D4E6DC] dark:border-[#4A3F6B] overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 backdrop-blur-md rounded-full transition-colors text-[#5C5247] dark:text-white"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Image Section */}
                <div className="relative h-64 bg-[#F5E6D3] dark:bg-[#1E1A2E] flex items-center justify-center p-8">
                    <img
                        src={`${DATA_BASE_URL}/images/${item.image}`}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110 drop-shadow-2xl"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="hidden w-full h-full items-center justify-center text-[#8B7E6B] dark:text-[#6B5B95] text-6xl font-bold">
                        {item.name.charAt(0)}
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute top-6 left-6 px-3 py-1 bg-[#7A9F7A] dark:bg-[#6B5B95] text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">
                        {item.category}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    <h2 className="text-xl sm:text-2xl font-black text-[#5C5247] dark:text-white leading-tight mb-1">
                        {item.name}
                    </h2>
                    <div className="text-base text-[#8B7E6B] dark:text-[#B8AED0] mb-8">
                        Per {item.unit}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#D4E6DC]/30 dark:border-[#4A3F6B]/30 pt-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95] uppercase font-bold tracking-tighter mb-1">Current Price</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-4xl font-black text-[#7A9F7A] dark:text-[#9D8EC9]">৳{item.price}</span>
                                <span className="text-sm text-[#8B7E6B] dark:text-[#6B5B95]">/ {item.unit}</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Divider / Accent */}
                    <div className="mt-8 flex gap-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-1.5 flex-1 rounded-full bg-[#D4E6DC] dark:bg-[#4A3F6B] odd:bg-[#7A9F7A] dark:odd:bg-[#6B5B95] opacity-20" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
