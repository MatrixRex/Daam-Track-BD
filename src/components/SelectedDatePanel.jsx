import React from 'react';
import { getTargetUnitLabel, parseUnit, getNormalizedPrice } from '../utils/quantityUtils';
import clsx from 'clsx';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function SelectedDatePanel({ items, stats = [], dateData, colors, normTargets, onSelect, onHover, deletingItems = [] }) {
  if (!dateData || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const color = colors[index % colors.length]?.stroke || '#7A9F7A';
        const isDeleting = deletingItems.includes(item.name);
        
        // Get the price on the selected date (already normalized from finalChartData)
        const datePrice = dateData.prices[item.name];
        
        // Get the current price
        const itemStat = stats.find(s => s.name === item.name);
        const currentPrice = itemStat?.current ?? item.price;
        
        // Get normalized current price for comparison
        const normalizedCurrentPrice = normTargets?.enabled 
          ? Math.round(getNormalizedPrice(currentPrice, item.unit, normTargets))
          : currentPrice;

        const unitLabel = normTargets?.enabled
          ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
          : item.unit;

        const hasPrice = datePrice !== undefined && datePrice !== null;
        
        // Difference: current price minus selected date price
        // Positive: price increased today compared to that date
        // Negative: price decreased today compared to that date (savings today)
        const diff = hasPrice ? normalizedCurrentPrice - Math.round(datePrice) : 0;

        return (
          <div
            key={`${item.name}-${normTargets?.enabled ? 'norm' : 'raw'}`}
            onClick={() => !isDeleting && onSelect(item.name)}
            onMouseEnter={() => !isDeleting && onHover(item.name)}
            onMouseLeave={() => !isDeleting && onHover(null)}
            className={clsx(
              "flex items-center justify-between gap-3 p-3 bg-muted rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group cursor-pointer relative overflow-hidden h-[68px]",
              "ring-2 border ring-transparent hover:ring-ring/35 border-border hover:border-transparent hover:translate-x-0.5",
              isDeleting 
                ? "opacity-0 -translate-x-full !max-h-0 !h-0 !p-0 !m-0 !border-0 !shadow-none pointer-events-none scale-y-0 duration-200 ease-in-out"
                : "max-h-[200px] opacity-100 scale-y-100"
            )}
            style={{ 
              borderLeft: isDeleting ? '0px solid transparent' : `3px solid ${color}`, 
              animationDelay: `${index * 40}ms`,
              transitionProperty: 'all, max-height, padding, margin, opacity, transform'
            }}
          >
            {/* Price on Date (Left aligned) */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 select-none">
                Price on Date
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-foreground leading-none">
                  {hasPrice ? `৳${Math.round(datePrice)}` : 'N/A'}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground leading-none">
                  / {unitLabel}
                </span>
              </div>
            </div>

            {/* Price Difference Indicator (Right aligned) */}
            <div className="flex items-center shrink-0">
              {hasPrice && diff !== 0 ? (
                <div className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm select-none border",
                  diff > 0 
                    ? "bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200/30" 
                    : "bg-primary/10 dark:bg-primary/5 text-primary border-primary/20"
                )}>
                  {diff > 0 ? (
                    <>
                      <ArrowUp size={11} className="stroke-[3]" />
                      <span>৳{Math.abs(diff)} Up</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown size={11} className="stroke-[3]" />
                      <span>৳{Math.abs(diff)} Down</span>
                    </>
                  )}
                </div>
              ) : hasPrice ? (
                <div className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-accent/50 border border-border/30 shadow-sm select-none">
                  No change
                </div>
              ) : (
                <div className="text-[10px] font-bold text-muted-foreground select-none">
                  No price data
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
