import React from 'react';
import { DATA_BASE_URL } from '../config';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsSidebar({ items, stats, colors, normTargets, onHover, selectedItemName, onSelect }) {

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FFFDF8] dark:bg-[#2A2442] border border-dashed border-[#D4E6DC] dark:border-[#4A3F6B] rounded-3xl h-full min-h-[400px]">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-[#F5E6D3] dark:bg-[#3D3460] flex items-center justify-center text-[#8B7E6B] dark:text-[#6B5B95]">
                    <TrendingUp className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-[#5C5247] dark:text-[#B8AED0] mb-2">Compare Products</h3>
                <p className="text-sm text-[#8B7E6B] dark:text-[#6B5B95] max-w-[200px]">
                    Search and select items to see their live stats and comparison.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 h-full max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
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

                const changeRaw = itemStat?.change ?? 0;
                const normalizedChange = normTargets?.enabled
                    ? Math.round(getNormalizedPrice(changeRaw, item.unit, normTargets))
                    : changeRaw;

                return (
                    <div
                        key={item.name}
                        onClick={() => onSelect(item.name)}
                        onMouseEnter={() => onHover(item.name)}
                        onMouseLeave={() => onHover(null)}
                        className={clsx(
                            "flex items-center gap-3 p-3 bg-[#FFFDF8] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-2xl shadow-sm hover:shadow-md hover:border-[#7A9F7A] dark:hover:border-[#9D8EC9] transition-all group cursor-pointer",
                            "motion-preset-fade motion-duration-300",
                            isSelected && "ring-2 ring-[#7A9F7A] dark:ring-[#9D8EC9] border-transparent bg-white dark:bg-[#1E1A2E]"
                        )}
                        style={{ borderLeft: `3px solid ${color}` }}
                    >
                        {/* Compact Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-[#F5E6D3] dark:bg-[#1E1A2E] p-1 flex-shrink-0 border border-[#D4E6DC] dark:border-[#4A3F6B] overflow-hidden">
                            <img
                                src={`${DATA_BASE_URL}/images/${item.image}`}
                                alt={item.name}
                                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-[#8B7E6B] dark:text-[#6B5B95] text-xs font-bold uppercase">
                                {item.name.charAt(0)}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#5C5247] dark:text-white truncate group-hover:text-[#7A9F7A] dark:group-hover:text-[#9D8EC9]">
                                {item.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-black text-[#5C5247] dark:text-white">
                                    ৳{normalizedPrice}
                                </span>
                                <span className="text-[10px] font-bold text-[#8B7E6B] dark:text-[#6B5B95]">
                                    / {unitLabel}
                                </span>
                            </div>
                        </div>

                        {/* Change/Trend */}
                        <div className="flex flex-col items-end gap-1">
                            {normalizedChange !== 0 ? (
                                <div className={clsx(
                                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-black",
                                    normalizedChange > 0 
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-500" 
                                        : "bg-[#D4E6DC] dark:bg-green-900/20 text-[#4A6B4A] dark:text-green-400"
                                )}>
                                    {normalizedChange > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                    ৳{Math.abs(normalizedChange)}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-gray-50 dark:bg-gray-800 text-gray-400">
                                    <Minus className="w-2.5 h-2.5" />
                                    No change
                                </div>
                            )}
                            
                            {/* Min/Max (Tiny) */}
                            {itemStat && (
                                <div className="flex gap-1 text-[9px] font-bold">
                                    <span className="text-[#8B7E6B] dark:text-[#6B5B95]">L:৳{normTargets?.enabled ? Math.round(getNormalizedPrice(itemStat.min, item.unit, normTargets)) : itemStat.min}</span>
                                    <span className="text-[#8B7E6B] dark:text-[#6B5B95]">H:৳{normTargets?.enabled ? Math.round(getNormalizedPrice(itemStat.max, item.unit, normTargets)) : itemStat.max}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
