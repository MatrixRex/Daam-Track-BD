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

// Custom Cursor to ensure vertical line renders correctly regardless of axis type
const CustomCursor = (props) => {
  const { x, y, width, height, stroke, strokeWidth, strokeDasharray, strokeOpacity, points } = props;

  // For continuous axis (Recharts passes points)
  if (points && points.length >= 2) {
    return (
      <line
        x1={points[0].x}
        y1={points[0].y}
        x2={points[1].x}
        y2={points[1].y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeOpacity={strokeOpacity}
      />
    );
  }

  // For categorical axis (Recharts passes x, y, width, height)
  // We draw a line down the middle of the band
  if (typeof x === 'number' && typeof y === 'number' && typeof height === 'number') {
    // If width is provided, center it. If not, just use x (it might be a point).
    const midX = typeof width === 'number' ? x + width / 2 : x;
    return (
      <line
        x1={midX}
        y1={y}
        x2={midX}
        y2={y + height}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeOpacity={strokeOpacity}
      />
    );
  }

  return null;
};

const PriceChart = React.memo(({ items = [], colors = [], hoveredItem, setHoveredItem, onStatsUpdate }) => {
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

  // Resolution & Aggregation State
  const [resolution, setResolution] = useState('auto'); // 'auto', 'daily', 'weekly', 'monthly', 'yearly'
  const [aggregation, setAggregation] = useState('avg'); // 'avg', 'max', 'min'

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

  // --- Aggregation Logic ---

  const getEffectiveResolution = useCallback(() => {
    if (resolution !== 'auto') return resolution;

    // Auto-detect based on duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 60) return 'daily';
    if (diffDays <= 365 * 2) return 'weekly';
    return 'monthly';
  }, [resolution, startDate, endDate]);

  const processedData = useMemo(() => {
    const effectiveRes = getEffectiveResolution();

    // Pass specific X-Axis mode to parent/render mapping usually, 
    // but here we just downsample the data.

    if (effectiveRes === 'daily' || !filteredChartData.length) {
      return filteredChartData;
    }

    // Helper to get group key
    const getGroupKey = (dateStr) => {
      const date = new Date(dateStr);
      if (effectiveRes === 'yearly') return `${date.getFullYear()}`;
      if (effectiveRes === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (effectiveRes === 'weekly') {
        // ISO Week approximation
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0]; // Group by Monday's date
      }
      return dateStr;
    };

    // Grouping
    const groups = new Map();
    filteredChartData.forEach(item => {
      const key = getGroupKey(item.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    // Aggregating
    const aggregated = [];
    const activeNames = items.map(i => i.name);

    groups.forEach((groupItems, key) => {
      const dateObj = new Date(groupItems[0].date); // Use first date for display properties
      // Re-construct display dates based on resolution
      let dateShort = groupItems[0].dateShort;
      let fullDate = groupItems[0].fullDate;

      if (effectiveRes === 'monthly') {
        dateShort = dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        fullDate = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      } else if (effectiveRes === 'yearly') {
        dateShort = dateObj.getFullYear().toString();
        fullDate = dateObj.getFullYear().toString();
      }

      const entry = {
        date: key, // The group key acts as the new date ID
        dateShort,
        fullDate,
      };

      // Calculate stats for each item
      activeNames.forEach(name => {
        const values = groupItems
          .map(d => d[name])
          .filter(v => v !== undefined && v !== null); // Only consider actual data points

        if (values.length === 0) {
          // Check if we have extended data
          const extValues = groupItems.map(d => d[`${name}_ext`]).filter(v => v !== undefined);
          if (extValues.length > 0) {
            // For extended lines, just take the first one (it's usually constant or linear)
            entry[`${name}_ext`] = extValues[0];
          }
          return;
        }

        let resultVal;
        if (aggregation === 'max') resultVal = Math.max(...values);
        else if (aggregation === 'min') resultVal = Math.min(...values);
        else resultVal = values.reduce((a, b) => a + b, 0) / values.length; // Average

        entry[name] = Math.round(resultVal); // Round to integer for cleaner UI
        entry[`${name}_area`] = Math.round(resultVal);

        // Also set ext for continuity if needed, but usually real data supercedes
        entry[`${name}_ext`] = Math.round(resultVal);
      });

      aggregated.push(entry);
    });

    return aggregated; // Groups are usually naturally sorted if inserted in order, but safe to sort?
    // filteredChartData is sorted, map insertion order is preserved in foreach, so yes.
  }, [filteredChartData, getEffectiveResolution, aggregation, items]);

  // Determine X-Axis Mode based on effective resolution now, not just dates
  const xAxisModeInner = useMemo(() => {
    const res = getEffectiveResolution();
    if (res === 'yearly') return 'yearly';
    if (res === 'monthly') return 'monthly';
    return xAxisMode; // Fallback to original logic for daily/weekly
  }, [getEffectiveResolution, xAxisMode]);

  // Calculate target domain from PROCESSED data
  const targetDomain = useMemo(() => {
    if (!processedData.length || !items.length) return [0, 100];

    // ... existing logic but using processedData ...
    let min = Infinity;
    let max = -Infinity;
    const activeNames = [...items.map(i => i.name), ...Array.from(removingItems)];

    processedData.forEach(row => {
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
  }, [processedData, items, removingItems]);

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

  // Notify parent of stats updates
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

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
            {items.length} item{items.length > 1 ? 's' : ''} • {processedData.length} data points
          </p>
        </div>

      </div>

      {/* Resolution Controls */}
      <div className="flex items-center gap-4">
        {/* Aggregation Selection (Only if not Daily) */}
        {getEffectiveResolution() !== 'daily' && (
          <div className="flex bg-slate-100 rounded-lg p-1">
            {['avg', 'min', 'max'].map(mode => (
              <button
                key={mode}
                onClick={() => setAggregation(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${aggregation === mode
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                {mode === 'avg' ? 'Avg' : mode === 'min' ? 'Low' : 'High'}
              </button>
            ))}
          </div>
        )}

        {/* Resolution dropdown/tabs */}
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
        >
          <option value="auto">Auto ({getEffectiveResolution()})</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

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
      </div>



      {/* Chart */}
      <div className="h-[400px] w-full mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={<CustomXAxisTick mode={xAxisModeInner} />}
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
              cursor={<CustomCursor stroke="#4b4f54" strokeWidth={1} strokeDasharray="5 5" strokeOpacity={0.4} />}
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

            {itemsToRender.map((item) => {
              const { isNew, isRemoving } = getLineState(item.name);
              const color = getItemColor(item.name);
              const isHovered = hoveredItem === item.name;
              // Performance: heavy animations only for small datasets
              const enableAnimation = items.length <= 10;

              return (
                <React.Fragment key={item.name}>
                  {/* Area for hover fill highlight - OPTIMIZED: Only render if hovered */}
                  {isHovered && (
                    <Area
                      type="monotone"
                      dataKey={`${item.name}_area`}
                      name={`${item.name}_area`}
                      stroke="none"
                      fill={color}
                      fillOpacity={0.15}
                      connectNulls={true}
                      isAnimationActive={false}
                      activeDot={false}
                      legendType="none"
                    />
                  )}

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
                    isAnimationActive={enableAnimation && isNew}
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
    </div>
  );
});

export default PriceChart;