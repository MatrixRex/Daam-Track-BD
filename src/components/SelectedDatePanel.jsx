import React from 'react';
import { getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';
import clsx from 'clsx';
import ProductImage from './ProductImage';

export default function SelectedDatePanel({ items, dateData, colors, normTargets, onSelect, onHover, deletingItems = [] }) {
  if (!dateData || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const color = colors[index % colors.length]?.stroke || '#7A9F7A';
        const isDeleting = deletingItems.includes(item.name);
        
        // Get the price on the selected date
        const datePrice = dateData.prices[item.name];
        
        const unitLabel = normTargets?.enabled
          ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
          : item.unit;

        const hasPrice = datePrice !== undefined && datePrice !== null;

        return (
          <div
            key={`${item.name}-${normTargets?.enabled ? 'norm' : 'raw'}`}
            onClick={() => !isDeleting && onSelect(item.name)}
            onMouseEnter={() => !isDeleting && onHover(item.name)}
            onMouseLeave={() => !isDeleting && onHover(null)}
            className={clsx(
              "flex items-center gap-3 p-3 bg-muted rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group cursor-pointer relative overflow-hidden h-[68px]",
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
            {/* Compact Thumbnail */}
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
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-foreground">
                  {hasPrice ? `৳${Math.round(datePrice)}` : 'N/A'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  / {unitLabel}
                </span>
              </div>
              <div className="w-full h-0.5 rounded-full mt-1.5 bg-transparent" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
