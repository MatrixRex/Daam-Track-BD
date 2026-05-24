import React from 'react';
import { RotateCcw, Scale, Droplet, Hash } from 'lucide-react';
import clsx from 'clsx';

export default function CommandBar({ normTargets, onUpdateNorm, onResetView }) {
    const categories = [
        { id: 'mass', label: 'Weight', icon: Scale, unit: 'kg' },
        { id: 'volume', label: 'Volume', icon: Droplet, unit: 'L' },
        { id: 'count', label: 'Count', icon: Hash, unit: 'pcs' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted border border-border rounded-2xl shadow-sm transition-all duration-300 motion-preset-fade motion-duration-300">
            {/* Normalization Toggle */}
            <div className="flex items-center gap-3 pr-4 border-r border-border">
                <button
                    onClick={() => onUpdateNorm({ ...normTargets, enabled: !normTargets.enabled })}
                    className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none border",
                        normTargets.enabled ? "bg-primary border-transparent" : "bg-muted border-border"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                <span className={clsx(
                    "text-sm font-bold transition-colors duration-300",
                    normTargets.enabled ? "text-foreground" : "text-muted-foreground"
                )}>
                    Normalize Units
                </span>
            </div>

            {/* Numeric Inputs */}
            <div className={clsx(
                "flex flex-wrap items-center gap-6 transition-all duration-300",
                normTargets.enabled ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 group">
                        <cat.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                        <div className="flex items-center bg-background border border-border rounded-lg px-2 py-1 focus-within:border-ring transition-all">
                            <input
                                type="number"
                                value={normTargets[cat.id]}
                                onChange={(e) => onUpdateNorm({ ...normTargets, [cat.id]: parseFloat(e.target.value) || 0 })}
                                className="w-12 bg-transparent text-sm font-bold text-foreground outline-none text-center"
                                step="any"
                                min="0"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground ml-1">{cat.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={clsx(
                "flex-1 transition-all duration-300",
                normTargets.enabled ? "opacity-100" : "opacity-0 pointer-events-none"
            )} />

            <button
                onClick={onResetView}
                className={clsx(
                    "flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-300",
                    normTargets.enabled
                        ? "opacity-100 text-muted-foreground hover:bg-background pointer-events-auto"
                        : "opacity-0 pointer-events-none text-muted-foreground"
                )}
                title="Zoom Out Data"
            >
                <RotateCcw className="w-4 h-4" />
                Reset
            </button>
        </div>
    );
}
