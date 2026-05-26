import React from 'react';
import { RotateCcw, Scale, Droplet, Hash } from 'lucide-react';
import clsx from 'clsx';
import Tooltip from './Tooltip';

export default function CommandBar({ normTargets, onUpdateNorm, onResetUnits }) {
    const categories = [
        { id: 'mass', label: 'Weight', icon: Scale, unit: 'kg' },
        { id: 'volume', label: 'Volume', icon: Droplet, unit: 'L' },
        { id: 'count', label: 'Count', icon: Hash, unit: 'pcs' },
    ];

    return (
        <div className="flex items-center gap-2 md:gap-4 px-2 md:px-4 h-16 bg-muted border border-border rounded-2xl shadow-sm transition-all duration-300 motion-preset-fade motion-duration-300">
            {/* Normalization Toggle */}
            <div className={clsx(
                "flex items-center gap-2 md:gap-3",
                normTargets.enabled && "pr-2 md:pr-4 border-r border-border"
            )}>
                <button
                    onClick={() => onUpdateNorm({ ...normTargets, enabled: !normTargets.enabled })}
                    className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-lg transition-colors focus:outline-none border",
                        normTargets.enabled ? "bg-primary border-transparent" : "bg-muted border-border"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-md bg-white transition-transform",
                            normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                {!normTargets.enabled && (
                    <span className="text-sm font-bold text-muted-foreground whitespace-nowrap animate-in fade-in duration-200">
                        Normalize Units
                    </span>
                )}
            </div>

            {/* Numeric Inputs */}
            {normTargets.enabled && (
                <div className="flex items-center gap-1.5 md:gap-6 animate-in fade-in slide-in-from-left-3 duration-300">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 md:gap-2 group">
                            <cat.icon className="hidden md:block w-4 h-4 text-muted-foreground" />
                            <span className="hidden md:inline text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                            <div className="flex items-center bg-background border border-border rounded-lg px-1.5 py-0.5 md:px-2 md:py-1 focus-within:border-ring transition-all">
                                <input
                                    type="number"
                                    value={normTargets[cat.id]}
                                    onChange={(e) => onUpdateNorm({ ...normTargets, [cat.id]: parseFloat(e.target.value) || 0 })}
                                    className="w-10 md:w-12 bg-transparent text-sm font-bold text-foreground outline-none text-center"
                                    step="any"
                                    min="0"
                                 />
                                <span className="text-[10px] font-bold text-muted-foreground ml-1">{cat.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1" />

            {normTargets.enabled && (
                <div className="animate-in fade-in zoom-in duration-200 flex items-center justify-center">
                    <Tooltip content="Reset Units" align="right">
                        <button
                            onClick={onResetUnits}
                            className="p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[26px] w-[26px] bg-background border border-border text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
                        >
                            <RotateCcw size={13} />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
