import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle } from 'lucide-react';

// Hook to smoothly animate Y-axis domain values
const useAnimatedDomain = (targetDomain, onAnimationComplete) => {
  const [currentDomain, setCurrentDomain] = useState(targetDomain);
  const animationRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!isFinite(targetDomain[0]) || !isFinite(targetDomain[1])) return;

    const start = currentDomain;
    const end = targetDomain;

    // If difference is very small, snap immediately
    if (Math.abs(start[0] - end[0]) < 1 && Math.abs(start[1] - end[1]) < 1) {
      setCurrentDomain(end);
      return;
    }

    isAnimatingRef.current = true;
    const startTime = performance.now();
    const duration = 600; // 600ms for Y-axis animation

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      const nextMin = start[0] + (end[0] - start[0]) * ease;
      const nextMax = start[1] + (end[1] - start[1]) * ease;

      setCurrentDomain([Math.round(nextMin), Math.round(nextMax)]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        if (onAnimationComplete) onAnimationComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetDomain[0], targetDomain[1]]);

  return { currentDomain, isAnimating: isAnimatingRef.current };
};

export default function PriceChart({ items = [], colors = [] }) {
  const { runQuery, loading: engineLoading } = useDuckDB();
  const dataCache = useRef(new Map());

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(null);

  const renderedItemsRef = useRef(new Set());
  const [newlyAddedItems, setNewlyAddedItems] = useState(new Set());
  const [removingItems, setRemovingItems] = useState(new Set());

  // Items waiting for domain animation to complete before line animation starts
  const [pendingLineAnimation, setPendingLineAnimation] = useState(new Set());

  // Persistent color assignments - each item keeps its color even after others are removed
  const colorAssignmentsRef = useRef(new Map());
  const nextColorIndexRef = useRef(0);

  const prevItemNamesRef = useRef(new Set());

  // --- Data Fetching Logic ---
  const fetchItemData = useCallback(async (item) => {
    if (dataCache.current.has(item.name)) {
      return dataCache.current.get(item.name);
    }
    const result = await runQuery(`
      SELECT date, price 
      FROM 'data.parquet' 
      WHERE name = '${item.name}' 
      ORDER BY date ASC
    `);
    const formattedData = result.map(r => ({
      date: r.date,
      price: Number(r.price),
      dateShort: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      fullDate: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    }));
    dataCache.current.set(item.name, formattedData);
    return formattedData;
  }, [runQuery]);

  const buildChartData = useCallback((itemNames) => {
    const dateMap = new Map();
    itemNames.forEach(name => {
      const itemData = dataCache.current.get(name);
      if (!itemData) return;
      itemData.forEach(point => {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, {
            date: point.date,
            dateShort: point.dateShort,
            fullDate: point.fullDate
          });
        }
        dateMap.get(point.date)[name] = point.price;
      });
    });
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, []);

  useEffect(() => {
    if (engineLoading) return;

    const currentNames = new Set(items.map(i => i.name));
    const prevNames = prevItemNamesRef.current;
    const added = items.filter(item => !prevNames.has(item.name));
    const removed = [...prevNames].filter(name => !currentNames.has(name));
    prevItemNamesRef.current = currentNames;

    // Handle removals
    if (removed.length > 0) {
      setRemovingItems(new Set(removed));
      setTimeout(() => {
        setRemovingItems(new Set());
        removed.forEach(name => renderedItemsRef.current.delete(name));
        const newData = buildChartData([...currentNames]);
        setChartData(newData);
      }, 600);
    }

    // Handle additions
    if (added.length > 0) {
      const fetchNew = async () => {
        const isFirstLoad = chartData.length === 0;
        if (isFirstLoad) setLoading(true);

        for (const item of added) {
          setLoadingItem(item.name);
          await fetchItemData(item);
        }
        setLoadingItem(null);
        if (isFirstLoad) setLoading(false);

        // Add items to pending - they'll wait for domain animation
        setPendingLineAnimation(new Set(added.map(i => i.name)));

        // Build chart data (this triggers domain recalculation)
        const newData = buildChartData([...currentNames]);
        setChartData(newData);

        // After domain animation completes (~600ms), start line animation
        setTimeout(() => {
          // Move from pending to newlyAdded (triggers line animation)
          setNewlyAddedItems(new Set(added.map(i => i.name)));
          setPendingLineAnimation(new Set());

          // After line animation completes (1200ms), mark as rendered
          setTimeout(() => {
            added.forEach(item => renderedItemsRef.current.add(item.name));
            setNewlyAddedItems(new Set());
          }, 1300);
        }, 650); // Slightly after domain animation (600ms)
      };
      fetchNew();
    }

    // Initial load
    if (added.length === 0 && removed.length === 0 && items.length > 0 && chartData.length === 0) {
      const fetchAll = async () => {
        setLoading(true);
        for (const item of items) {
          setLoadingItem(item.name);
          await fetchItemData(item);
        }
        setLoadingItem(null);
        setLoading(false);

        setPendingLineAnimation(new Set(items.map(i => i.name)));
        const newData = buildChartData([...currentNames]);
        setChartData(newData);

        setTimeout(() => {
          setNewlyAddedItems(new Set(items.map(i => i.name)));
          setPendingLineAnimation(new Set());

          setTimeout(() => {
            items.forEach(item => renderedItemsRef.current.add(item.name));
            setNewlyAddedItems(new Set());
          }, 1300);
        }, 650);
      };
      fetchAll();
    }
  }, [items, engineLoading, fetchItemData, buildChartData]);

  // Calculate target domain
  const targetDomain = useMemo(() => {
    if (!chartData.length || !items.length) return [0, 100];

    let min = Infinity;
    let max = -Infinity;

    const activeNames = [...items.map(i => i.name), ...Array.from(removingItems)];
    if (activeNames.length === 0) return [0, 100];

    chartData.forEach(row => {
      activeNames.forEach(name => {
        const val = row[name];
        if (val !== undefined) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    if (!isFinite(min)) return [0, 100];
    if (min === max) { min -= 10; max += 10; }

    const padding = Math.max((max - min) * 0.1, 5);
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, items, removingItems]);

  // Animate domain
  const { currentDomain } = useAnimatedDomain(targetDomain);

  // Get or assign a persistent color for an item
  const getItemColor = useCallback((itemName) => {
    // If already assigned, return the stored color
    if (colorAssignmentsRef.current.has(itemName)) {
      return colorAssignmentsRef.current.get(itemName);
    }

    // Assign next available color
    const colorIndex = nextColorIndexRef.current % colors.length;
    const color = colors[colorIndex]?.stroke || '#3B82F6';
    colorAssignmentsRef.current.set(itemName, color);
    nextColorIndexRef.current++;

    return color;
  }, [colors]);

  // Stats calculation - use persistent colors
  const stats = useMemo(() => {
    if (!chartData.length || !items.length) return [];
    return items.map((item) => {
      const prices = chartData.map(d => d[item.name]).filter(p => p !== undefined);
      if (!prices.length) return null;
      const current = prices[prices.length - 1];
      const prev = prices.length > 1 ? prices[prices.length - 2] : current;
      return {
        name: item.name,
        color: getItemColor(item.name),
        current,
        min: Math.min(...prices),
        max: Math.max(...prices),
        change: current - prev
      };
    }).filter(Boolean);
  }, [chartData, items, getItemColor]);

  // Determine animation state for each line
  const getLineState = useCallback((itemName) => {
    const isPending = pendingLineAnimation.has(itemName);
    const isNew = newlyAddedItems.has(itemName) && !renderedItemsRef.current.has(itemName);
    const isRemoving = removingItems.has(itemName);
    return { isPending, isNew, isRemoving };
  }, [pendingLineAnimation, newlyAddedItems, removingItems]);

  // --- RENDER ---

  if (loading && chartData.length === 0) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-400">{loadingItem ? `Loading ${loadingItem}...` : 'Loading...'}</span>
      </div>
    );
  }

  if (items.length > 0 && chartData.length === 0 && !loading) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-red-400">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm">No history found.</span>
      </div>
    );
  }

  if (items.length === 0 && removingItems.size === 0) return null;

  // Build list of items to render:
  // - Exclude items that are pending (waiting for Y-axis animation) 
  // - Include items being removed (for fade out animation)
  const itemsToRender = items.filter(item => !pendingLineAnimation.has(item.name));
  removingItems.forEach(name => {
    if (!itemsToRender.some(i => i.name === name)) {
      itemsToRender.push({ name, _removing: true });
    }
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
      {loadingItem && chartData.length > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium z-10 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Adding {loadingItem}...
        </div>
      )}

      {/* Header / Stats */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Price Comparison</h3>
          <p className="text-xs text-slate-400 mt-1">{items.length} item{items.length > 1 ? 's' : ''} • Last 90 days</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => {
            const { isRemoving } = getLineState(stat.name);
            const isNew = newlyAddedItems.has(stat.name);
            const isPending = pendingLineAnimation.has(stat.name);
            return (
              <div
                key={stat.name}
                className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg transition-all duration-500 ${isRemoving ? 'opacity-0 scale-90 -translate-x-2' : 'opacity-100 scale-100'
                  } ${isNew || isPending ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                <span className="text-xs font-medium text-slate-600 max-w-[100px] truncate">{stat.name}</span>
                <span className="text-sm font-bold text-slate-900">৳{stat.current}</span>
                <span className={`text-xs font-medium ${stat.change > 0 ? 'text-red-500' : stat.change < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                  {stat.change > 0 ? '▲' : stat.change < 0 ? '▼' : ''} {Math.abs(stat.change)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} minTickGap={30} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              unit="৳"
              domain={[currentDomain[0], currentDomain[1]]}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
              formatter={(value, name) => [`৳${value}`, name]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className={`text-sm transition-opacity duration-500 ${removingItems.has(value) ? 'opacity-20 line-through' : 'text-slate-600'}`}>
                  {value}
                </span>
              )}
            />
            {itemsToRender.map((item) => {
              const { isNew, isRemoving } = getLineState(item.name);
              const color = getItemColor(item.name);

              return (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  name={item.name}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={isRemoving ? false : { r: 6, strokeWidth: 2, fill: 'white' }}
                  // Animate when line first appears (after domain animation)
                  isAnimationActive={isNew}
                  animationDuration={1200}
                  animationBegin={0}
                  animationEasing="ease-in-out"
                  animationId={`line-${item.name}`}
                  style={{
                    opacity: isRemoving ? 0 : 1,
                    transition: 'opacity 600ms ease-out',
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-3 justify-center">
          {stats.map((stat) => {
            const { isRemoving } = getLineState(stat.name);
            return (
              <div key={stat.name} className={`flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg transition-all duration-500 ${isRemoving ? 'opacity-0 scale-75' : ''}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-xs text-slate-500 truncate max-w-[100px]">{stat.name}</span>
                <span className="text-xs text-green-600">L:৳{stat.min}</span>
                <span className="text-xs text-red-600">H:৳{stat.max}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}