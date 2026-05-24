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
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        normTargets.enabled ? "bg-primary" : "bg-muted"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                <span className="text-sm font-bold text-foreground">
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

            {/* Actions Spacer */}
            <div className="flex-1" />

            {/* Reset View */}
            <button
                onClick={onResetView}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-background rounded-xl transition-all"
                title="Zoom Out Data"
            >
                <RotateCcw className="w-4 h-4" />
                Reset
            </button>
        </div>
    );
}
