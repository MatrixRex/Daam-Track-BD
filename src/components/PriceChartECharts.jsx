import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';

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
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

const PriceChartECharts = React.memo(({ items = [], colors = [], hoveredItem, setHoveredItem, onStatsUpdate }) => {
    const { runQuery, loading: engineLoading } = useDuckDB();
    const echartsRef = useRef(null);
    const dataCache = useRef(new Map());

    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingItem, setLoadingItem] = useState(null);

    // Maintain color consistency
    const colorAssignmentsRef = useRef(new Map());
    const nextColorIndexRef = useRef(0);

    // Date range filter
    const defaultRange = getDefaultDateRange();
    const [startDate, setStartDate] = useState(defaultRange.start);
    const [endDate, setEndDate] = useState(defaultRange.end);
    const today = getTodayDate();

    // Resolution & Aggregation State
    const [resolution, setResolution] = useState('auto'); // 'auto', 'daily', 'weekly', 'monthly', 'yearly'
    const [aggregation, setAggregation] = useState('avg'); // 'avg', 'max', 'min'

    // Data fetching logic (Same as original)
    const fetchItemData = useCallback(async (item) => {
        if (dataCache.current.has(item.name)) {
            return dataCache.current.get(item.name);
        }
        const result = await runQuery(`
      SELECT date, price 
      FROM 'prices/*.parquet' 
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

        // Identify added/removed items
        // Simple logic: if items changed, re-fetch missing ones and rebuild
        const currentNames = new Set(items.map(i => i.name));

        // Check if we need to fetch anything
        const missing = items.filter(item => !dataCache.current.has(item.name));

        if (missing.length > 0) {
            const fetchAll = async () => {
                setLoading(true);
                for (const item of missing) {
                    setLoadingItem(item.name);
                    await fetchItemData(item);
                }
                setLoadingItem(null);
                setLoading(false);
                setChartData(buildChartData([...currentNames]));
            };
            fetchAll();
        } else {
            // Just rebuild if selection changed but data is cached
            setChartData(buildChartData([...currentNames]));
        }

    }, [items, engineLoading, fetchItemData, buildChartData]);

    // Generate filtered/extended data (Same logic)
    const filteredChartData = useMemo(() => {
        if (!startDate || !endDate || !items.length) return [];

        const startYear = parseInt(startDate.split('-')[0]);
        const endYear = parseInt(endDate.split('-')[0]);
        const multiYear = startYear !== endYear;

        // Generate all dates
        const allDates = [];
        let current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const dateStr = formatDateForInput(current);
            const day = current.getDate();
            const monthIndex = current.getMonth();
            const year = current.getFullYear();

            allDates.push({
                date: dateStr,
                dateShort: multiYear
                    ? `${day} ${MONTH_NAMES[monthIndex]} '${String(year).slice(-2)}`
                    : `${day} ${MONTH_NAMES[monthIndex]}`,
                fullDate: `${day} ${MONTH_NAMES_FULL[monthIndex]} ${year}`
            });
            current.setDate(current.getDate() + 1);
        }

        const dataMap = new Map(chartData.map(r => [r.date, r]));

        // Calculate bounds
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

        return allDates.map(dateEntry => {
            const existing = dataMap.get(dateEntry.date);
            const result = { ...dateEntry };

            items.forEach(item => {
                const name = item.name;
                const extKey = `${name}_ext`;
                const bounds = itemBounds[name];

                if (!bounds) {
                    result[name] = undefined;
                    result[extKey] = undefined;
                } else if (existing && existing[name] !== undefined) {
                    result[name] = existing[name];
                    result[extKey] = existing[name];
                } else if (dateEntry.date < bounds.firstDate) {
                    result[name] = undefined;
                    result[extKey] = bounds.firstValue;
                } else if (dateEntry.date > bounds.lastDate) {
                    result[name] = undefined;
                    result[extKey] = bounds.lastValue;
                } else {
                    result[name] = undefined;
                    result[extKey] = undefined; // ECharts handles connectNulls or we can interpolate if needed
                }
            });
            return result;
        });
    }, [chartData, startDate, endDate, items]);

    // Aggregation Logic (Same or simplified)
    const getEffectiveResolution = useCallback(() => {
        if (resolution !== 'auto') return resolution;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        if (diffDays <= 60) return 'daily';
        if (diffDays <= 365 * 2) return 'weekly';
        return 'monthly';
    }, [resolution, startDate, endDate]);

    const processedData = useMemo(() => {
        const effectiveRes = getEffectiveResolution();
        if (effectiveRes === 'daily' || !filteredChartData.length) return filteredChartData;

        // ... (Aggregation logic implementation similar to original) ...
        // For brevity, using simplified version assuming filteredChartData is enough if performant, 
        // but USER asked for performance, so let's keep aggregation.

        const getGroupKey = (dateStr) => {
            const date = new Date(dateStr);
            if (effectiveRes === 'yearly') return `${date.getFullYear()}`;
            if (effectiveRes === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (effectiveRes === 'weekly') {
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(date.setDate(diff));
                return monday.toISOString().split('T')[0];
            }
            return dateStr;
        };

        const groups = new Map();
        filteredChartData.forEach(item => {
            const key = getGroupKey(item.date);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        });

        const aggregated = [];
        const activeNames = items.map(i => i.name);

        groups.forEach((groupItems, key) => {
            const dateObj = new Date(groupItems[0].date);
            let dateShort = groupItems[0].dateShort;
            let fullDate = groupItems[0].fullDate;

            if (effectiveRes === 'monthly') {
                dateShort = dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                fullDate = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            } else if (effectiveRes === 'yearly') {
                dateShort = dateObj.getFullYear().toString();
                fullDate = dateObj.getFullYear().toString();
            }

            const entry = { date: key, dateShort, fullDate };

            activeNames.forEach(name => {
                const values = groupItems.map(d => d[name]).filter(v => v !== undefined && v !== null);

                // Handle extended values
                const extValues = groupItems.map(d => d[`${name}_ext`]).filter(v => v !== undefined);
                let extVal = undefined;
                if (extValues.length > 0) extVal = extValues[0]; // Simplification for extensions

                if (values.length === 0) {
                    entry[`${name}_ext`] = extVal;
                    return;
                }

                let resultVal;
                if (aggregation === 'max') resultVal = Math.max(...values);
                else if (aggregation === 'min') resultVal = Math.min(...values);
                else resultVal = values.reduce((a, b) => a + b, 0) / values.length;

                entry[name] = Math.round(resultVal);
                entry[`${name}_ext`] = Math.round(resultVal);
            });

            aggregated.push(entry);
        });

        return aggregated; // Sorting usually preserved by map insertion order logic
    }, [filteredChartData, getEffectiveResolution, aggregation, items]);


    // Calculate stats
    useEffect(() => {
        if (!filteredChartData.length || !items.length) {
            if (onStatsUpdate) onStatsUpdate([]);
            return;
        }
        const newStats = items.map((item) => {
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
        if (onStatsUpdate) onStatsUpdate(newStats);
    }, [filteredChartData, items]); // removed getItemColor dependency warning


    // Determine Colors
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

    // ECharts Option Generation
    const option = useMemo(() => {
        const activeNames = items.map(i => i.name);

        // Series generation
        const series = [];
        activeNames.forEach(name => {
            const color = getItemColor(name);

            // Main Line
            series.push({
                name: name,
                type: 'line',
                data: processedData.map(d => d[name]),
                itemStyle: { color: color },
                lineStyle: { width: 2 },
                showSymbol: false,
                smooth: true,
                emphasis: {
                    disabled: true
                },
                // Area filling on specific hover or if active?
                areaStyle: {
                    opacity: hoveredItem === name ? 0.2 : 0,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color },
                        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                    ])
                },
                connectNulls: true,
                z: 2
            });

            // Extended Line (Dashed)
            series.push({
                name: `${name}_ext`,
                type: 'line',
                data: processedData.map(d => d[`${name}_ext`]),
                itemStyle: { color: color },
                lineStyle: { type: 'dashed', opacity: 0.5, width: 2 },
                showSymbol: false,
                smooth: true,
                connectNulls: true,
                z: 1,
                silent: true,
                emphasis: { disabled: true }
            });
        });

        const isMultiYear = (new Date(endDate).getFullYear() - new Date(startDate).getFullYear()) > 0;
        const xAxisMode = getEffectiveResolution();

        return {
            grid: {
                left: 20,
                right: 20,
                top: 20,
                bottom: xAxisMode === 'detailed' ? 60 : 40,
                containLabel: true,
                borderColor: '#f1f5f9',
                show: true,
                borderWidth: 0 // Hide border, just use splitLines
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 12,
                borderWidth: 0,
                padding: 12,
                textStyle: { color: '#1e293b' },
                extraCssText: 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);',
                axisPointer: {
                    type: 'line', // Ensure we use a line
                    lineStyle: {
                        color: '#4b4f54',
                        width: 1,
                        type: 'dashed',
                        opacity: 0.4
                    },
                    animation: false // Disable animation to prevent "glitching" or lagging behind cursor
                },
                formatter: (params) => {
                    if (!params.length) return '';
                    const dateIndex = params[0].dataIndex;
                    const dateItem = processedData[dateIndex];
                    if (!dateItem) return '';

                    let html = `<div class="font-medium text-slate-500 mb-2">${dateItem.fullDate}</div>`;

                    params.forEach(p => {
                        if (p.seriesName.endsWith('_ext') || p.value === undefined) return;
                        // Don't duplicate if both ext and normal exist (normal takes precedence in stats usually)

                        const color = p.color;
                        const value = p.value;
                        const name = p.seriesName;

                        html += `
                        <div class="flex items-center gap-2 text-sm">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${color};"></span>
                            <span class="text-slate-600">${name}:</span>
                            <span class="font-bold text-slate-900">৳${value}</span>
                        </div>
                    `;
                    });
                    return html;
                }
            },
            xAxis: {
                type: 'category',
                data: processedData.map(d => d.dateShort), // Use pre-formatted short dates
                boundaryGap: false,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#64748b',
                    interval: 'auto', // Let ECharts decide density
                    formatter: (value, index) => {
                        return value.replace(' ', '\n');
                    },
                    fontSize: 11
                },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true, // Auto-scale
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: true, lineStyle: { color: '#f1f5f9' } },
                axisLabel: {
                    formatter: '৳{value}',
                    color: '#94a3b8',
                    fontSize: 12
                }
            },
            series: series,
            animationDuration: 500,
            animationEasing: 'cubicOut'
        };
    }, [items, processedData, getItemColor, hoveredItem, startDate, endDate, getEffectiveResolution]);


    // Handle Hover from external list
    // Sync chart highlight with hoveredItem prop (declarative in options)

    if (loading && items.length > 0 && chartData.length === 0) {
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

    if (items.length === 0) return null;

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

            {/* Controls */}
            <div className="flex items-center gap-4 mb-4">
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

            <div className="h-[400px] w-full mt-6">
                <ReactECharts
                    ref={echartsRef}
                    option={option}
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true} // Important for series updates
                    lazyUpdate={true}
                />
            </div>
        </div>
    );
});

export default PriceChartECharts;
