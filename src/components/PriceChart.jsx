import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PriceChart({ items = [], colors = [] }) {
  const { runQuery, loading: engineLoading } = useDuckDB();

  // Cache for storing fetched data per item
  const dataCache = useRef(new Map());

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(null);

  // Track which items have been rendered before (for animation control)
  const renderedItemsRef = useRef(new Set());
  const [newlyAddedItems, setNewlyAddedItems] = useState(new Set());
  const [removingItems, setRemovingItems] = useState(new Set());

  const prevItemNamesRef = useRef(new Set());

  // Fetch data for a single item
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

  // Merge chart data from cache
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

  // Handle item changes
  useEffect(() => {
    if (engineLoading) return;

    const currentNames = new Set(items.map(i => i.name));
    const prevNames = prevItemNamesRef.current;

    // Find newly added items (not rendered before)
    const added = items.filter(item => !prevNames.has(item.name));
    const removed = [...prevNames].filter(name => !currentNames.has(name));

    // Update previous names ref
    prevItemNamesRef.current = currentNames;

    // Handle removals - fade out then remove
    if (removed.length > 0) {
      setRemovingItems(new Set(removed));

      // After fade animation, rebuild chart without removed items
      setTimeout(() => {
        setRemovingItems(new Set());
        // Remove from rendered set
        removed.forEach(name => renderedItemsRef.current.delete(name));
        // Rebuild chart data
        const newData = buildChartData([...currentNames]);
        setChartData(newData);
      }, 500);
    }

    // Handle additions - fetch new data only
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

        // Mark these items as newly added (for animation)
        setNewlyAddedItems(new Set(added.map(i => i.name)));

        // Build updated chart data
        const newData = buildChartData([...currentNames]);
        setChartData(newData);

        // After animation completes, mark items as rendered
        setTimeout(() => {
          added.forEach(item => renderedItemsRef.current.add(item.name));
          setNewlyAddedItems(new Set());
        }, 1200);
      };

      fetchNew();
    }

    // Initial load case (no adds or removes, but items exist and no data)
    if (added.length === 0 && removed.length === 0 && items.length > 0 && chartData.length === 0) {
      const fetchAll = async () => {
        setLoading(true);

        for (const item of items) {
          setLoadingItem(item.name);
          await fetchItemData(item);
        }

        setLoadingItem(null);
        setLoading(false);

        setNewlyAddedItems(new Set(items.map(i => i.name)));

        const newData = buildChartData([...currentNames]);
        setChartData(newData);

        setTimeout(() => {
          items.forEach(item => renderedItemsRef.current.add(item.name));
          setNewlyAddedItems(new Set());
        }, 1200);
      };

      fetchAll();
    }
  }, [items, engineLoading, fetchItemData, buildChartData]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!chartData.length || !items.length) return [];

    return items.map((item, index) => {
      const prices = chartData
        .map(d => d[item.name])
        .filter(p => p !== undefined);

      if (!prices.length) return null;

      const current = prices[prices.length - 1];
      const prev = prices.length > 1 ? prices[prices.length - 2] : current;
      const change = current - prev;

      return {
        name: item.name,
        color: colors[index % colors.length]?.stroke || '#3B82F6',
        current,
        min: Math.min(...prices),
        max: Math.max(...prices),
        change
      };
    }).filter(Boolean);
  }, [chartData, items, colors]);

  // Get color for item by index
  const getItemColor = useCallback((itemName) => {
    const index = items.findIndex(i => i.name === itemName);
    return colors[index >= 0 ? index % colors.length : 0]?.stroke || '#3B82F6';
  }, [items, colors]);

  // Determine if a line should animate
  const shouldAnimate = useCallback((itemName) => {
    // Only animate if it's newly added and hasn't been rendered before
    return newlyAddedItems.has(itemName) && !renderedItemsRef.current.has(itemName);
  }, [newlyAddedItems]);

  // --- RENDER ---

  if (loading && chartData.length === 0) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-400">
          {loadingItem ? `Loading ${loadingItem}...` : 'Loading Price History...'}
        </span>
      </div>
    );
  }

  if (items.length > 0 && chartData.length === 0 && !loading) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-red-400">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm">No history found for selected items.</span>
      </div>
    );
  }

  if (items.length === 0 && removingItems.size === 0) {
    return null;
  }

  // Items to render (current + removing for fade animation)
  const itemsToRender = [...items];
  removingItems.forEach(name => {
    if (!itemsToRender.some(i => i.name === name)) {
      // Add a placeholder for the removing item
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

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Price Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {items.length} item{items.length > 1 ? 's' : ''} • Last 90 days
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => {
            const isNew = newlyAddedItems.has(stat.name);
            const isRemoving = removingItems.has(stat.name);

            return (
              <div
                key={stat.name}
                className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg transition-all duration-500 ${isRemoving ? 'opacity-0 scale-90 -translate-x-2' : 'opacity-100 scale-100'
                  } ${isNew ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
              >
                <div
                  className="w-2 h-2 rounded-full transition-transform duration-300"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="text-xs font-medium text-slate-600 max-w-[100px] truncate">
                  {stat.name}
                </span>
                <span className="text-sm font-bold text-slate-900">৳{stat.current}</span>
                <span className={`text-xs font-medium ${stat.change > 0 ? 'text-red-500' : stat.change < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                  {stat.change > 0 ? '▲' : stat.change < 0 ? '▼' : ''}
                  {Math.abs(stat.change)}
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
            <XAxis
              dataKey="dateShort"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              unit="৳"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
              formatter={(value, name) => [`৳${value}`, name]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className={`text-sm transition-opacity duration-500 ${removingItems.has(value) ? 'opacity-20 line-through' : 'text-slate-600'
                  }`}>
                  {value}
                </span>
              )}
            />
            {itemsToRender.map((item) => {
              const isNew = shouldAnimate(item.name);
              const isRemoving = removingItems.has(item.name);
              const color = getItemColor(item.name);

              return (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  name={item.name}
                  stroke={color}
                  strokeWidth={isRemoving ? 1 : 2.5}
                  strokeOpacity={isRemoving ? 0.2 : 1}
                  dot={false}
                  activeDot={isRemoving ? false : { r: 6, strokeWidth: 2, fill: 'white' }}
                  // KEY: Only animate new items, existing items should NOT re-animate
                  isAnimationActive={isNew}
                  animationDuration={isNew ? 1000 : 0}
                  animationBegin={0}
                  animationEasing="ease-out"
                  // Use a stable animation ID to prevent re-animation on data updates
                  animationId={`line-${item.name}`}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Min/Max Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-3 justify-center">
          {stats.map((stat) => {
            const isRemoving = removingItems.has(stat.name);

            return (
              <div
                key={stat.name}
                className={`flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg transition-all duration-500 ${isRemoving ? 'opacity-0 scale-75' : ''
                  }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stat.color }}
                />
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