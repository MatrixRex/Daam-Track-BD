import React from 'react';
import { DATA_BASE_URL } from '../config';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import { TrendingUp, TrendingDown, Minus, Info, Maximize2 } from 'lucide-react';
import clsx from 'clsx';

export default function ItemDetailsPanel({ item, stats, normTargets }) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted border border-dashed border-border rounded-3xl h-[600px]">
        <div className="w-20 h-20 mb-6 rounded-3xl bg-background flex items-center justify-center text-muted-foreground opacity-50">
          <Info className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Product Insights</h3>
        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
          Select any item from the comparison list to view detailed performance metrics, history, and specifications.
        </p>
      </div>
    );
  }

  const currentPrice = stats?.current ?? item.price;
  const normalizedPrice = normTargets?.enabled 
    ? Math.round(getNormalizedPrice(currentPrice, item.unit, normTargets))
    : currentPrice;
  
  const unitLabel = normTargets?.enabled
    ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
    : item.unit;

  const change = stats?.change ?? 0;
  const normalizedChange = normTargets?.enabled
    ? Math.round(getNormalizedPrice(change, item.unit, normTargets))
    : change;

  return (
    <div key={`${item.name}-${normTargets?.enabled ? 'norm' : 'raw'}`} className="flex flex-col bg-muted border border-border rounded-3xl shadow-xl overflow-hidden flex-1 min-h-0 motion-preset-blur-right motion-duration-300">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Visual Hero */}
        <div className="relative group mb-8">
          <div className="w-full aspect-square rounded-3xl bg-accent p-8 border border-border shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-[1.02]">
            <img
              src={`${DATA_BASE_URL}/images/${item.image}`}
              alt={item.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-50/20 to-transparent pointer-events-none" />
          </div>
          
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-accent rounded-full shadow-md text-[10px] font-semibold uppercase tracking-wider text-primary border border-border/50">
            {item.category}
          </div>
        </div>

        {/* Primary Info */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2 leading-tight">
            {item.name}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-background rounded-lg text-xs font-medium text-muted-foreground">
            <Maximize2 size={12} />
            Base Unit: {item.unit}
          </div>
        </div>

        {/* Pricing Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="col-span-2 p-5 bg-background/30 rounded-2xl border border-border/40">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Current Market Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">৳{normalizedPrice}</span>
              <span className="text-sm font-medium text-muted-foreground">/ {unitLabel}</span>
            </div>
            {change !== 0 ? (
              <div className={clsx(
                "mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm",
                change > 0 
                  ? "bg-red-50 text-red-500" 
                  : "bg-primary/10 text-primary"
              )}>
                {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                ৳{Math.abs(normalizedChange)} {change > 0 ? 'Increase' : 'Savings'}
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-400">
                <Minus size={14} />
                No change
              </div>
            )}
          </div>

          <div className="p-4 bg-accent rounded-2xl border border-border/20">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Historic Low</span>
            <span className="text-lg font-semibold text-foreground">৳{normTargets?.enabled ? Math.round(getNormalizedPrice(stats?.min ?? item.price, item.unit, normTargets)) : (stats?.min ?? item.price)}</span>
          </div>

          <div className="p-4 bg-accent rounded-2xl border border-border/20">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Historic High</span>
            <span className="text-lg font-semibold text-foreground">৳{normTargets?.enabled ? Math.round(getNormalizedPrice(stats?.max ?? item.price, item.unit, normTargets)) : (stats?.max ?? item.price)}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
