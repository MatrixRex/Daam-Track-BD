import React from 'react';
import { DATA_BASE_URL } from '../config';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import { X, TrendingUp, TrendingDown, Minus, Info, Trash2, Maximize2 } from 'lucide-react';
import clsx from 'clsx';

export default function ItemDetailsPanel({ item, stats, normTargets, onClose, onRemove }) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FFFDF8] dark:bg-[#2A2442] border border-dashed border-[#D4E6DC] dark:border-[#4A3F6B] rounded-3xl h-[600px]">
        <div className="w-20 h-20 mb-6 rounded-3xl bg-[#F5E6D3] dark:bg-[#3D3460] flex items-center justify-center text-[#8B7E6B] dark:text-[#6B5B95] opacity-50">
          <Info className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-[#5C5247] dark:text-[#B8AED0] mb-3">Product Insights</h3>
        <p className="text-sm text-[#8B7E6B] dark:text-[#6B5B95] max-w-[240px] leading-relaxed">
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
    <div key={item.name} className="flex flex-col bg-[#FFFDF8] dark:bg-[#2A2442] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-3xl shadow-xl overflow-hidden h-full min-h-[600px] motion-preset-blur-right motion-duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#D4E6DC]/40 dark:border-[#4A3F6B]/40 bg-[#F5E6D3]/30 dark:bg-[#1E1A2E]/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#7A9F7A] dark:bg-[#6B5B95]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#8B7E6B] dark:text-[#6B5B95]">Detail Insight</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white dark:hover:bg-[#3D3460] rounded-xl text-[#8B7E6B] dark:text-[#6B5B95] transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Visual Hero */}
        <div className="relative group mb-8">
          <div className="w-full aspect-square rounded-3xl bg-white dark:bg-[#1E1A2E] p-8 border border-[#D4E6DC] dark:border-[#4A3F6B] shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-[1.02]">
            <img
              src={`${DATA_BASE_URL}/images/${item.image}`}
              alt={item.name}
              className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F5E6D3]/20 to-transparent pointer-events-none" />
          </div>
          
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-white dark:bg-[#3D3460] rounded-full shadow-md text-[10px] font-black uppercase tracking-wider text-[#7A9F7A] dark:text-[#9D8EC9] border border-[#D4E6DC]/50 dark:border-[#4A3F6B]/50">
            {item.category}
          </div>
        </div>

        {/* Primary Info */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[#5C5247] dark:text-white mb-2 leading-tight">
            {item.name}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5E6D3] dark:bg-[#3D3460] rounded-lg text-xs font-bold text-[#8B7E6B] dark:text-[#6B5B95]">
            <Maximize2 size={12} />
            Base Unit: {item.unit}
          </div>
        </div>

        {/* Pricing Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="col-span-2 p-5 bg-[#F5E6D3]/30 dark:bg-[#3D3460]/30 rounded-2xl border border-[#D4E6DC]/40 dark:border-[#4A3F6B]/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8B7E6B] dark:text-[#6B5B95] mb-2 block">
              Current Market Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#5C5247] dark:text-white">৳{normalizedPrice}</span>
              <span className="text-sm font-bold text-[#8B7E6B] dark:text-[#6B5B95]">/ {unitLabel}</span>
            </div>
            {change !== 0 && (
              <div className={clsx(
                "mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-sm",
                change > 0 
                  ? "bg-red-50 dark:bg-red-900/30 text-red-500" 
                  : "bg-[#D4E6DC] dark:bg-green-900/30 text-[#4A6B4A] dark:text-green-400"
              )}>
                {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                ৳{Math.abs(normalizedChange)} {change > 0 ? 'Increase' : 'Savings'}
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-[#1E1A2E]/50 rounded-2xl border border-[#D4E6DC]/20 dark:border-[#4A3F6B]/20">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#8B7E6B] dark:text-[#6B5B95] mb-1 block">Historic Low</span>
            <span className="text-lg font-black text-[#5C5247] dark:text-white">৳{normTargets?.enabled ? Math.round(getNormalizedPrice(stats?.min ?? item.price, item.unit, normTargets)) : (stats?.min ?? item.price)}</span>
          </div>

          <div className="p-4 bg-white dark:bg-[#1E1A2E]/50 rounded-2xl border border-[#D4E6DC]/20 dark:border-[#4A3F6B]/20">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#8B7E6B] dark:text-[#6B5B95] mb-1 block">Historic High</span>
            <span className="text-lg font-black text-[#5C5247] dark:text-white">৳{normTargets?.enabled ? Math.round(getNormalizedPrice(stats?.max ?? item.price, item.unit, normTargets)) : (stats?.max ?? item.price)}</span>
          </div>
        </div>

        {/* Specs/Meta */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FFFDF8] dark:bg-[#1E1A2E] border border-[#D4E6DC]/30 dark:border-[#4A3F6B]/30">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#8B7E6B] dark:text-[#6B5B95]">Standardization</span>
                <span className="text-xs font-black text-[#7A9F7A] dark:text-[#9D8EC9]">Enabled</span>
             </div>
             <p className="text-[11px] text-[#8B7E6B] dark:text-[#6B5B95] leading-relaxed italic">
               Calculated based on {normTargets?.enabled ? 'manual override' : 'default unit'} targets to ensure accurate multi-product comparison.
             </p>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 bg-[#F5E6D3]/20 dark:bg-[#1E1A2E]/40 border-t border-[#D4E6DC]/40 dark:border-[#4A3F6B]/40 mt-auto">
        <button
          onClick={() => onRemove(item)}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 rounded-2xl text-sm font-black transition-all border border-red-100 dark:border-red-900/30"
        >
          <Trash2 size={16} />
          Remove from Dashboard
        </button>
      </div>
    </div>
  );
}
