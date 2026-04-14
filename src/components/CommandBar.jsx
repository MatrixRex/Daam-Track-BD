import React from 'react';
import { Trash2, RotateCcw, Scale, Droplet, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function CommandBar({ normTargets, onUpdateNorm, onClearAll, onResetView }) {
    const categories = [
        { id: 'mass', label: 'Weight', icon: Scale, unit: 'kg' },
        { id: 'volume', label: 'Volume', icon: Droplet, unit: 'L' },
        { id: 'count', label: 'Count', icon: Hash, unit: 'pcs' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[#FFFDF8] dark:bg-[#2A2442] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-2xl shadow-sm transition-all duration-300">
            {/* Normalization Toggle */}
            <div className="flex items-center gap-3 pr-4 border-r border-[#D4E6DC] dark:border-[#4A3F6B]">
                <button
                    onClick={() => onUpdateNorm({ ...normTargets, enabled: !normTargets.enabled })}
                    className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        normTargets.enabled ? "bg-[#7A9F7A] dark:bg-[#6B5B95]" : "bg-[#D4E6DC] dark:bg-[#4A3F6B]"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                <span className="text-sm font-bold text-[#5C5247] dark:text-[#B8AED0]">
                    Normalize Price
                </span>
            </div>

            {/* Numeric Inputs */}
            <div className={clsx(
                "flex flex-wrap items-center gap-6 transition-all duration-300",
                !normTargets.enabled && "opacity-40 pointer-events-none grayscale"
            )}>
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 group">
                        <cat.icon className="w-4 h-4 text-[#8B7E6B] dark:text-[#6B5B95]" />
                        <span className="text-xs font-bold text-[#8B7E6B] dark:text-[#6B5B95] uppercase tracking-wider">{cat.label}</span>
                        <div className="flex items-center bg-[#F5E6D3] dark:bg-[#1E1A2E] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-lg px-2 py-1 focus-within:border-[#7A9F7A] dark:focus-within:border-[#9D8EC9] transition-all">
                            <input
                                type="number"
                                value={normTargets[cat.id]}
                                onChange={(e) => onUpdateNorm({ ...normTargets, [cat.id]: parseFloat(e.target.value) || 0 })}
                                className="w-12 bg-transparent text-sm font-bold text-[#5C5247] dark:text-white outline-none text-center"
                                step="any"
                                min="0"
                            />
                            <span className="text-[10px] font-bold text-[#8B7E6B] dark:text-[#6B5B95] ml-1">{cat.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions Spacer */}
            <div className="flex-1" />

            {/* Global Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onResetView}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#8B7E6B] dark:text-[#B8AED0] hover:bg-[#F5E6D3] dark:hover:bg-[#3D3460] rounded-xl transition-all"
                    title="Zoom Out Data"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </button>
                <button
                    onClick={onClearAll}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-800/30"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                </button>
            </div>
        </div>
    );
}
