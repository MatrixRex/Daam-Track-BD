import React from 'react';
import { DATA_BASE_URL } from '../config';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';

export default function ItemDetailModal({ item, onClose, normTargets, stats }) {
    if (!item) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-sm bg-background-100 rounded-3xl shadow-2xl border border-primary-200 overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-background-200/40 hover:bg-background-200/60 backdrop-blur-md rounded-full transition-colors text-text-800"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Image Section */}
                <div className="relative h-64 bg-background-50 flex items-center justify-center p-8">
                    <img
                        src={`${DATA_BASE_URL}/images/${item.image}`}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110 drop-shadow-2xl"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="hidden w-full h-full items-center justify-center text-text-500 text-6xl font-bold">
                        {item.name.charAt(0)}
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute top-6 left-6 px-3 py-1 bg-primary-500 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">
                        {item.category}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    <h2 className="text-xl sm:text-2xl font-black text-text-800 leading-tight mb-1">
                        {item.name}
                    </h2>
                    <div className="text-base text-text-500 mb-8">
                        Per {item.unit}
                    </div>

                    <div className="flex flex-col border-t border-primary-200/30 pt-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-text-500 uppercase font-bold tracking-tighter mb-1">
                                    {normTargets ? 'Normalized Price' : 'Current Price'}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl sm:text-4xl font-black text-primary-500">
                                        ৳{normTargets
                                            ? Math.round(getNormalizedPrice(stats?.current ?? item.price, item.unit, normTargets))
                                            : (stats?.current ?? item.price)}
                                    </span>
                                    <span className="text-sm text-text-500">
                                        / {normTargets
                                            ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
                                            : item.unit}
                                    </span>
                                </div>
                            </div>

                            {/* Price Change Chip */}
                            {stats && stats.change !== 0 && (
                                <div className={clsx(
                                    "px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5 shadow-md",
                                    stats.change > 0 ? "bg-red-50 dark:bg-red-900/40 text-red-600 border border-red-100 dark:border-red-800/30" :
                                        "bg-primary-200 text-primary-700 border border-primary-200/30"
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
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-primary-200/40 flex items-center justify-center text-xs font-black text-primary-700 border border-primary-200/60">L</div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-500 font-bold uppercase">Lowest</span>
                                        <span className="text-base font-black text-text-800 leading-none">
                                            ৳{normTargets ? Math.round(getNormalizedPrice(stats.min, item.unit, normTargets)) : stats.min}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-xs font-black text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800/20">H</div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-500 font-bold uppercase">Highest</span>
                                        <span className="text-base font-black text-text-800 leading-none">
                                            ৳{normTargets ? Math.round(getNormalizedPrice(stats.max, item.unit, normTargets)) : stats.max}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Visual Divider / Accent */}
                    <div className="mt-8 flex gap-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-1.5 flex-1 rounded-full bg-primary-200 odd:bg-primary-500 opacity-20" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
