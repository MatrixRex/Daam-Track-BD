import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';

// Hook to smoothly animate Y-axis domain values
const useAnimatedDomain = (targetDomain, onAnimationComplete) => {
  const [currentDomain, setCurrentDomain] = useState(targetDomain);
  const animationRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!isFinite(targetDomain[0]) || !isFinite(targetDomain[1])) return;

    const start = currentDomain;
    const end = targetDomain;

    if (Math.abs(start[0] - end[0]) < 1 && Math.abs(start[1] - end[1]) < 1) {
      setCurrentDomain(end);
      return;
    }

    isAnimatingRef.current = true;
    const startTime = performance.now();
    const duration = 600;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

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

// Helper to get date string in YYYY-MM-DD format
const formatDateForInput = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper to display date in DD/MM/YYYY format
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => formatDateForInput(new Date());

// Get default date range (last 90 days)
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end)
  };
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Custom styled date input component
const DateInput = ({ value, onChange, label, min, max }) => {
  const inputRef = useRef(null);
  const displayValue = formatDateForDisplay(value);

  const openPicker = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.();
    }
  };

  return (
    <div
      className="relative flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
      onClick={openPicker}
    >
      <span className="text-sm font-medium text-slate-700 pointer-events-none">
        {displayValue}
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
};

// Custom X Axis Tick Component for Cascading Labels
const CustomXAxisTick = ({ x, y, payload, mode }) => {
  if (!payload || !payload.value) return null;

  // Manual parsing to avoid timezone issues: YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = payload.value.split('-');
  const day = parseInt(dayStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const yearShort = `'${yearStr.slice(-2)}`;
  const yearFull = yearStr;

  const monthName = MONTH_NAMES[monthIndex];

  // Mode Logic:
  // 'detailed': Day (top), Month (mid), Year (bot)
  // 'monthly': Month (top), Year (bot)
  // 'yearly': Year (top)

  return (
    <g transform={`translate(${x},${y})`}>
      {mode === 'detailed' && (
        <React.Fragment>
          <text x={0} y={0} dy={14} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={500}>
            {day}
          </text>
          <text x={0} y={0} dy={28} textAnchor="middle" fill="#94a3b8" fontSize={10}>
            {monthName}
          </text>
          <text x={0} y={0} dy={42} textAnchor="middle" fill="#cbd5e1" fontSize={10}>
            {yearShort}
          </text>
        </React.Fragment>
      )}

      {mode === 'monthly' && (
        <React.Fragment>
          <text x={0} y={0} dy={14} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={500}>
            {monthName}
          </text>
          <text x={0} y={0} dy={28} textAnchor="middle" fill="#94a3b8" fontSize={10}>
            {yearFull}
          </text>
        </React.Fragment>
      )}

      {mode === 'yearly' && (
        <text x={0} y={0} dy={14} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={500}>
          {yearFull}
        </text>
      )}
    </g>
  );
};

export default function PriceChart({ items = [], colors = [], hoveredItem, setHoveredItem }) {
  const { runQuery, loading: engineLoading } = useDuckDB();
  const dataCache = useRef(new Map());

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(null);

  const renderedItemsRef = useRef(new Set());
  const [newlyAddedItems, setNewlyAddedItems] = useState(new Set());
  const [removingItems, setRemovingItems] = useState(new Set());
  const [pendingLineAnimation, setPendingLineAnimation] = useState(new Set());

  const colorAssignmentsRef = useRef(new Map());
  const nextColorIndexRef = useRef(0);
  const prevItemNamesRef = useRef(new Set());

  // Date range filter
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const today = getTodayDate();

  // Determine X-Axis Mode based on range duration
  const { xAxisMode, xAxisHeight } = useMemo(() => {
    if (!startDate || !endDate) return { xAxisMode: 'detailed', xAxisHeight: 60 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 270) { // ~9 months
      return { xAxisMode: 'detailed', xAxisHeight: 60 };
    } else if (diffDays <= 365 * 3) { // ~3 years
      return { xAxisMode: 'monthly', xAxisHeight: 45 };
    } else {
      return { xAxisMode: 'yearly', xAxisHeight: 30 };
    }
  }, [startDate, endDate]);

  // Data fetching
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
    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, []);

  useEffect(() => {
    if (engineLoading) return;

    const currentNames = new Set(items.map(i => i.name));
    const prevNames = prevItemNamesRef.current;
    const added = items.filter(item => !prevNames.has(item.name));
    const removed = [...prevNames].filter(name => !currentNames.has(name));
    prevItemNamesRef.current = currentNames;

    if (removed.length > 0) {
      setRemovingItems(new Set(removed));
      setTimeout(() => {
        setRemovingItems(new Set());
        removed.forEach(name => renderedItemsRef.current.delete(name));
        setChartData(buildChartData([...currentNames]));
      }, 600);
    }

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

        setPendingLineAnimation(new Set(added.map(i => i.name)));
        setChartData(buildChartData([...currentNames]));

        setTimeout(() => {
          setNewlyAddedItems(new Set(added.map(i => i.name)));
          setPendingLineAnimation(new Set());
          setTimeout(() => {
            added.forEach(item => renderedItemsRef.current.add(item.name));
            setNewlyAddedItems(new Set());
          }, 1300);
        }, 650);
      };
      fetchNew();
    }

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
        setChartData(buildChartData([...currentNames]));

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

  // Generate all dates in range and fill with data
  // Edge behavior: extend first/last values horizontally to edges
  // Middle gaps: connect with straight line (via connectNulls)
  const filteredChartData = useMemo(() => {
    if (!startDate || !endDate || !items.length) return [];

    // Generate all dates in the range (avoiding timezone issues)
    const allDates = [];
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Check if range spans multiple years
    const multiYear = startYear !== endYear;

    // Use UTC to avoid timezone shifts
    let current = Date.UTC(startYear, startMonth - 1, startDay);
    const endTime = Date.UTC(endYear, endMonth - 1, endDay);

    while (current <= endTime) {
      const d = new Date(current);
      const year = d.getUTCFullYear();
      const monthIndex = d.getUTCMonth();
      const day = d.getUTCDate();
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      allDates.push({
        date: dateStr,
        // Include year in short format if multi-year range to avoid confusion
        dateShort: multiYear
          ? `${day} ${monthNamesShort[monthIndex]} '${String(year).slice(-2)}`
          : `${day} ${monthNamesShort[monthIndex]}`,
        fullDate: `${day} ${monthNamesLong[monthIndex]} ${year}`
      });

      // Move to next day (add 24 hours in milliseconds)
      current += 24 * 60 * 60 * 1000;
    }

    // Create a map of existing data
    const dataMap = new Map();
    chartData.forEach(row => {
      dataMap.set(row.date, row);
    });

    // For each item, find first and last data points
    const itemBounds = {};
    items.forEach(item => {
      const name = item.name;
      const itemDates = chartData
        .filter(row => row[name] !== undefined)
        .map(row => row.date)
        .sort();

      if (itemDates.length > 0) {
        itemBounds[name] = {
          firstDate: itemDates[0],
          lastDate: itemDates[itemDates.length - 1],
          firstValue: chartData.find(r => r.date === itemDates[0])?.[name],
          lastValue: chartData.find(r => r.date === itemDates[itemDates.length - 1])?.[name]
        };
      }
    });

    // Build the result with separate keys for real data vs extended data
    // Format: itemName = actual data, itemName_ext = extended/interpolated line
    return allDates.map(dateEntry => {
      const existing = dataMap.get(dateEntry.date);
      const result = { ...dateEntry };

      items.forEach(item => {
        const name = item.name;
        const extKey = `${name}_ext`;
        const bounds = itemBounds[name];

        if (!bounds) {
          // No data for this item at all
          result[name] = undefined;
          result[extKey] = undefined;
        } else if (existing && existing[name] !== undefined) {
          // We have actual data for this date - put in both keys for connection
          result[name] = existing[name];
          result[extKey] = existing[name]; // Also in ext for continuous dashed line
          result[`${name}_area`] = existing[name]; // For area chart
        } else if (dateEntry.date < bounds.firstDate) {
          // Before first data point - only in extended key
          result[name] = undefined;
          result[extKey] = bounds.firstValue;
          result[`${name}_area`] = bounds.firstValue; // Extended area
        } else if (dateEntry.date > bounds.lastDate) {
          // After last data point - only in extended key
          result[name] = undefined;
          result[extKey] = bounds.lastValue;
          result[`${name}_area`] = bounds.lastValue; // Extended area
        } else {
          // Gap in the middle - only in extended key for interpolation
          result[name] = undefined;
          result[extKey] = undefined; // Will be connected by connectNulls
          result[`${name}_area`] = undefined;
        }
      });

      return result;
    });
  }, [chartData, startDate, endDate, items]);

  // Calculate target domain
  const targetDomain = useMemo(() => {
    if (!filteredChartData.length || !items.length) return [0, 100];

    let min = Infinity;
    let max = -Infinity;
    const activeNames = [...items.map(i => i.name), ...Array.from(removingItems)];

    filteredChartData.forEach(row => {
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
  }, [filteredChartData, items, removingItems]);

  const { currentDomain } = useAnimatedDomain(targetDomain);

  const getItemColor = useCallback((itemName) => {
    if (colorAssignmentsRef.current.has(itemName)) {
      return colorAssignmentsRef.current.get(itemName);
    }
    const colorIndex = nextColorIndexRef.current % colors.length;
    const color = colors[colorIndex]?.stroke || '#3B82F6';
    colorAssignmentsRef.current.set(itemName, color);
    nextColorIndexRef.current++;
    return color;
  }, [colors]);

  const stats = useMemo(() => {
    if (!filteredChartData.length || !items.length) return [];
    return items.map((item) => {
      const prices = filteredChartData.map(d => d[item.name]).filter(p => p !== undefined);
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
  }, [filteredChartData, items, getItemColor]);

  const getLineState = useCallback((itemName) => {
    const isPending = pendingLineAnimation.has(itemName);
    const isNew = newlyAddedItems.has(itemName) && !renderedItemsRef.current.has(itemName);
    const isRemoving = removingItems.has(itemName);
    return { isPending, isNew, isRemoving };
  }, [pendingLineAnimation, newlyAddedItems, removingItems]);

  // Loading state
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

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Price Comparison</h3>
          <p className="text-xs text-slate-400 mt-1">
            {items.length} item{items.length > 1 ? 's' : ''} • {filteredChartData.length} days
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <DateInput
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            label="Start date"
            max={endDate}
          />
          <span className="text-slate-400 text-sm font-medium">to</span>
          <DateInput
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            label="End date"
            min={startDate}
            max={today}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => {
            const { isRemoving } = getLineState(stat.name);
            const isNew = newlyAddedItems.has(stat.name);
            const isPending = pendingLineAnimation.has(stat.name);
            const isHovered = hoveredItem === stat.name;
            return (
              <div
                key={stat.name}
                onMouseEnter={() => setHoveredItem(stat.name)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg transition-all duration-300 cursor-pointer ${isRemoving ? 'opacity-0 scale-90 -translate-x-2' : 'opacity-100 scale-100'
                  } ${isNew || isPending ? 'ring-2 ring-blue-300 ring-offset-1' : ''} ${isHovered ? 'ring-2 ring-blue-100 bg-blue-50/80 shadow-sm' : ''}`}
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
          <ComposedChart data={filteredChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={<CustomXAxisTick mode={xAxisMode} />}
              minTickGap={30}
              height={xAxisHeight}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              unit="৳"
              domain={[currentDomain[0], currentDomain[1]]}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              cursor={<line stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />}
              labelFormatter={(label, payload) => {
                // Find a payload entry that has fullDate (prefer non-ext entries)
                const entry = payload?.find(p => p.payload?.fullDate);
                return entry?.payload?.fullDate || label;
              }}
              formatter={(value, name) => {
                // Hide extended line entries and Area entries from tooltip
                if (name.endsWith('_ext') || name.endsWith('_area')) return null;
                return [`৳${value}`, name];
              }}
              filterNull={true}
            />
            <Legend
              verticalAlign="top"
              height={36}
              onMouseEnter={(e) => setHoveredItem(e.value)}
              onMouseLeave={() => setHoveredItem(null)}
              formatter={(value) => (
                <span className={`text-sm transition-opacity duration-500 ${removingItems.has(value) ? 'opacity-20 line-through' : 'text-slate-600'} ${hoveredItem === value ? 'font-medium text-slate-900' : ''}`}>
                  {value}
                </span>
              )}
            />
            {itemsToRender.map((item) => {
              const { isNew, isRemoving } = getLineState(item.name);
              const color = getItemColor(item.name);
              const isHovered = hoveredItem === item.name;

              return (
                <React.Fragment key={item.name}>
                  {/* Area for hover fill highlight */}
                  <Area
                    type="monotone"
                    dataKey={`${item.name}_area`}
                    name={`${item.name}_area`}
                    stroke="none"
                    fill={color}
                    fillOpacity={isHovered ? 0.15 : 0}
                    connectNulls={true}
                    isAnimationActive={false}
                    activeDot={false}
                    legendType="none"
                    style={{
                      transition: 'fill-opacity 300ms ease-in-out',
                    }}
                  />
                  {/* Dashed line for extended/missing data - renders first (background) */}
                  <Line
                    type="monotone"
                    dataKey={`${item.name}_ext`}
                    name={`${item.name}_ext`}
                    stroke={color}
                    strokeWidth={isHovered ? 3 : 1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={false}
                    connectNulls={true}
                    isAnimationActive={false}
                    legendType="none"
                    style={{
                      opacity: isRemoving ? 0 : 0.4,
                      transition: 'opacity 600ms ease-out',
                    }}
                  />
                  {/* Solid line for actual data - renders on top */}
                  <Line
                    type="monotone"
                    dataKey={item.name}
                    name={item.name}
                    stroke={color}
                    strokeWidth={isHovered ? 4 : 2.5}
                    dot={false}
                    activeDot={isRemoving ? false : { r: 6, strokeWidth: 2, fill: 'white' }}
                    isAnimationActive={isNew}
                    animationDuration={1200}
                    animationBegin={0}
                    animationEasing="ease-in-out"
                    animationId={`line-${item.name}`}
                    connectNulls={true}
                    style={{
                      opacity: isRemoving ? 0 : 1,
                      transition: 'opacity 600ms ease-out',
                    }}
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
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