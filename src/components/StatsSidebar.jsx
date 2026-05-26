import React from 'react';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import clsx from 'clsx';
import { TrendingUp, Trash2 } from 'lucide-react';
import ProductImage from './ProductImage';

export default function StatsSidebar({ items, stats, colors, normTargets, onHover, selectedItemName, onSelect, onRemove, selectedDateData, deletingItems = [] }) {

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted border border-dashed border-border rounded-2xl h-full min-h-[400px]">
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
                const isDeleting = deletingItems.includes(item.name);
                
                // Normalization Logic
                const currentRawPrice = itemStat?.current ?? item.price;
                const currentPrice = normTargets?.enabled 
                    ? Math.round(getNormalizedPrice(currentRawPrice, item.unit, normTargets))
                    : currentRawPrice;
                
                const hasSelectedPrice = selectedDateData && selectedDateData[item.name] !== undefined;
                const selectedRawPrice = hasSelectedPrice ? selectedDateData[item.name] : currentRawPrice;
                const selectedPrice = normTargets?.enabled
                    ? Math.round(getNormalizedPrice(selectedRawPrice, item.unit, normTargets))
                    : selectedRawPrice;

                const unitLabel = normTargets?.enabled
                    ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
                    : item.unit;

                const isComparisonMode = !!selectedDateData;
                const priceDiff = currentPrice - selectedPrice;

                return (
                    <div
                        key={`${item.name}-${normTargets?.enabled ? 'norm' : 'raw'}`}
                        onClick={() => !isDeleting && onSelect(item.name)}
                        onMouseEnter={() => !isDeleting && onHover(item.name)}
                        onMouseLeave={() => !isDeleting && onHover(null)}
                        className={clsx(
                            "flex items-center gap-3 p-3 bg-muted rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group cursor-pointer relative overflow-hidden h-[68px]",
                            "ring-2 border",
                            isSelected 
                                ? "ring-ring border-transparent bg-accent translate-x-1.5 shadow-md" 
                                : isComparisonMode
                                    ? "ring-purple-500/10 border-purple-500/25 dark:border-purple-400/25 hover:border-purple-500/40 hover:ring-purple-500/20"
                                    : "ring-transparent hover:ring-ring/35 border-border hover:border-transparent hover:translate-x-0.5",
                            isDeleting 
                                ? "opacity-0 -translate-x-full !max-h-0 !h-0 !p-0 !m-0 !border-0 !shadow-none pointer-events-none scale-y-0 duration-200 ease-in-out"
                                : "max-h-[200px] opacity-100 scale-y-100 motion-preset-fade motion-duration-200"
                        )}
                        style={{ 
                            borderLeft: isDeleting ? '0px solid transparent' : `3px solid ${color}`, 
                            animationDelay: `${index * 40}ms`,
                            transitionProperty: 'all, max-height, padding, margin, opacity, transform'
                        }}
                    >
                        {/* Compact Thumbnail (With premium dynamic fallback) */}
                        <ProductImage
                            item={item}
                            color={color}
                            className="w-10 h-10 rounded-lg flex-shrink-0 border border-border overflow-hidden"
                            imgClassName="mix-blend-multiply dark:mix-blend-normal dark:brightness-110"
                            fallbackSize="text-sm"
                        />

                        {/* Info Section */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate">
                                {item.name}
                            </h4>
                            <div className="flex items-baseline justify-between mt-0.5 flex-wrap gap-x-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-black text-foreground">
                                        ৳{isComparisonMode ? selectedPrice : currentPrice}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        / {unitLabel}
                                    </span>
                                </div>

                                {isComparisonMode && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold shrink-0">
                                        <span className="text-muted-foreground/80">
                                            Cur: ৳{currentPrice}
                                        </span>
                                        {priceDiff > 0 ? (
                                            <span className="text-red-500 bg-red-500/10 dark:bg-red-500/20 px-1 rounded flex items-center gap-0.5">
                                                ▲ ৳{priceDiff}
                                            </span>
                                        ) : priceDiff < 0 ? (
                                            <span className="text-green-500 bg-green-500/10 dark:bg-green-500/20 px-1 rounded flex items-center gap-0.5">
                                                ▼ ৳{Math.abs(priceDiff)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground bg-muted dark:bg-zinc-800 px-1 rounded">
                                                —
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div 
                              className={clsx(
                                "w-full h-0.5 rounded-full mt-1.5 transition-colors duration-300",
                                isComparisonMode
                                  ? "bg-purple-400/40"
                                  : (itemStat?.change ?? 0) > 0 
                                    ? "bg-red-400/60" 
                                    : (itemStat?.change ?? 0) < 0 
                                      ? "bg-green-400/60" 
                                      : "bg-transparent"
                              )} 
                            />
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
