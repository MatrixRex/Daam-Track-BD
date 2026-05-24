import React from 'react';
import { DATA_BASE_URL } from '../config';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import clsx from 'clsx';
import { TrendingUp, Trash2 } from 'lucide-react';

export default function StatsSidebar({ items, stats, colors, normTargets, onHover, selectedItemName, onSelect, onRemove }) {

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted border border-dashed border-border rounded-3xl h-full min-h-[400px]">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-background flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Compare Products</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                    Search and select items to see their live stats and comparison.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map((item, index) => {
                const color = colors[index % colors.length]?.stroke || '#7A9F7A';
                const itemStat = stats.find(s => s.name === item.name);
                const isSelected = selectedItemName === item.name;
                
                // Normalization Logic
                const currentPrice = itemStat?.current ?? item.price;
                const normalizedPrice = normTargets?.enabled 
                    ? Math.round(getNormalizedPrice(currentPrice, item.unit, normTargets))
                    : currentPrice;
                
                const unitLabel = normTargets?.enabled
                    ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
                    : item.unit;

                return (
                    <div
                        key={`${item.name}-${normTargets?.enabled ? 'norm' : 'raw'}`}
                        onClick={() => onSelect(item.name)}
                        onMouseEnter={() => onHover(item.name)}
                        onMouseLeave={() => onHover(null)}
                        className={clsx(
                            "flex items-center gap-3 p-3 bg-muted rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group cursor-pointer relative overflow-hidden",
                            "motion-preset-fade motion-duration-200",
                            "ring-2 border",
                            isSelected 
                                ? "ring-ring border-transparent bg-accent translate-x-1.5 shadow-md" 
                                : "ring-transparent hover:ring-ring/35 border-border hover:border-transparent hover:translate-x-0.5"
                        )}
                        style={{ borderLeft: `3px solid ${color}`, animationDelay: `${index * 40}ms` }}
                    >
                        {/* Compact Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-background p-1 flex-shrink-0 border border-border overflow-hidden">
                            <img
                                src={`${DATA_BASE_URL}/images/${item.image}`}
                                alt={item.name}
                                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-muted-foreground text-xs font-bold uppercase">
                                {item.name.charAt(0)}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate">
                                {item.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-black text-foreground">
                                    ৳{normalizedPrice}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    / {unitLabel}
                                </span>
                            </div>
                            {(itemStat?.change ?? 0) > 0 && (
                                <div className="w-full h-0.5 rounded-full bg-red-400/60 mt-1.5" />
                            )}
                            {(itemStat?.change ?? 0) < 0 && (
                                <div className="w-full h-0.5 rounded-full bg-green-400/60 mt-1.5" />
                            )}
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                          className="absolute right-0 top-0 h-full aspect-square translate-x-full group-hover:translate-x-0 transition-transform duration-200 bg-red-400 hover:bg-red-500 flex items-center justify-center text-white shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>


                    </div>
                );
            })}
        </div>
    );
}
