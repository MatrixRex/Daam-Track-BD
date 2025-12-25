import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle, Calendar, ChevronDown } from 'lucide-react';
import Tooltip from './Tooltip';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from '../utils/quantityUtils';

// Hook to detect dark mode
const useDarkMode = () => {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
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
    end.setDate(end.getDate() - 1);
    const start = new Date('2025-11-30');
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
            className="relative flex items-center bg-[#FFFDF8] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-lg px-3 py-1.5 hover:border-[#97B897] dark:hover:border-[#6B5B95] hover:bg-[#D4E6DC]/30 dark:hover:bg-[#4A3F6B] transition-colors cursor-pointer"
            onClick={openPicker}
        >
            <span className="text-sm font-medium text-[#5C5247] dark:text-[#B8AED0] pointer-events-none">
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

const PriceChartECharts = React.forwardRef(({ items = [], colors = [], hoveredItem, setHoveredItem, onStatsUpdate, normTargets }, ref) => {
    const { runQuery, loading: engineLoading } = useDuckDB();
    const echartsRef = useRef(null);
    const dataCache = useRef(new Map());
    const isDark = useDarkMode();

    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingItem, setLoadingItem] = useState(null);
    const [isNormalizing, setIsNormalizing] = useState(false);
    const [finalChartData, setFinalChartData] = useState([]);
    const localHoveredRef = useRef(null); // Ref for lag-free tooltip updates

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
    const [isDensityOpen, setIsDensityOpen] = useState(false);

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
        exportImage: async (mode = 'download') => { // mode: 'download' | 'copy'
            const chart = echartsRef.current?.getEchartsInstance();
            if (!chart) return;

            // Show legend temporarily for the screenshot
            const currentOption = chart.getOption();
            const currentBottom = currentOption.grid[0]?.bottom || 40;
            const legendHeight = Math.ceil(items.length / 3) * 30 + 20; // Approx 30px per row + padding

            chart.setOption({
                grid: { bottom: currentBottom + legendHeight },
                legend: {
                    show: true,
                    bottom: 10,
                    left: 'center',
                    data: items.map(i => i.name),
                    formatter: (name) => {
                        const item = items.find(i => i.name === name);
                        return item ? `${name} (${item.unit})` : name;
                    },
                    textStyle: { color: isDark ? '#B8AED0' : '#5C5247' }
                }
            });

            // Get Data URL (Raw)
            const rawUrl = chart.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: isDark ? '#2A2442' : '#FFFDF8'
            });

            // Revert legend AND grid
            chart.setOption({
                legend: { show: false },
                grid: { bottom: currentBottom }
            });

            // Post-process for rounded corners
            const addRoundedCorners = (url, radius = 20) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const w = img.width;
                        const h = img.height;
                        canvas.width = w;
                        canvas.height = h;

                        // Create rounded clipping path
                        ctx.beginPath();
                        ctx.moveTo(radius, 0);
                        ctx.lineTo(w - radius, 0);
                        ctx.quadraticCurveTo(w, 0, w, radius);
                        ctx.lineTo(w, h - radius);
                        ctx.quadraticCurveTo(w, h, w - radius, h);
                        ctx.lineTo(radius, h);
                        ctx.quadraticCurveTo(0, h, 0, h - radius);
                        ctx.lineTo(0, radius);
                        ctx.quadraticCurveTo(0, 0, radius, 0);
                        ctx.closePath();
                        ctx.clip();

                        // Draw image
                        ctx.drawImage(img, 0, 0);

                        // Return blob
                        canvas.toBlob((blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas to Blob failed'));
                        }, 'image/png');
                    };
                    img.onerror = (e) => reject(e);
                    img.src = url;
                });
            };

            try {
                const blob = await addRoundedCorners(rawUrl);

                if (mode === 'copy') {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast.success('Image copied to clipboard');
                } else {
                    // Trigger download
                    const newUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `price-chart-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = newUrl;
                    link.click();
                    URL.revokeObjectURL(newUrl);
                }
            } catch (err) {
                console.error("Failed to export image:", err);
                toast.error('Failed to export image');
            }
        },
        exportData: async (format, mode = 'download') => { // format: 'json' | 'csv' | 'xlsx', mode: 'download' | 'copy'
            if (!items.length || !processedData.length) return;

            // Prepare clean data for export
            const dataToExport = processedData.map(row => {
                const rowData = {
                    Date: row.fullDate,
                    'Date (Short)': row.dateShort,
                    'ISO Date': row.date,
                };
                items.forEach(item => {
                    const header = `${item.name} (${item.unit})`;
                    const val = row[item.name];
                    rowData[header] = (val !== undefined && val !== null)
                        ? (normTargets ? Math.round(getNormalizedPrice(val, item.unit, normTargets)) : val)
                        : '';
                });
                return rowData;
            });

            const filename = `price-data-${new Date().toISOString().split('T')[0]}`;
            const itemHeaders = items.map(i => `${i.name} (${i.unit})`);

            if (format === 'json') {
                const jsonString = JSON.stringify(dataToExport, null, 2);
                if (mode === 'copy') {
                    await navigator.clipboard.writeText(jsonString);
                    toast.success('JSON data copied to clipboard');
                } else {
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${filename}.json`;
                    link.click();
                }
            } else if (format === 'csv') {
                const headers = ['Date', 'Date (Short)', 'ISO Date', ...itemHeaders];
                const keyMap = {
                    'Date': 'Date',
                    'Date (Short)': 'Date (Short)',
                    'ISO Date': 'ISO Date',
                };
                items.forEach(i => {
                    keyMap[`${i.name} (${i.unit})`] = `${i.name} (${i.unit})`;
                });

                const csvContent = [
                    headers.join(','),
                    ...dataToExport.map(row => headers.map(header => {
                        const val = row[header] !== undefined ? row[header] : '';
                        return JSON.stringify(val);
                    }).join(','))
                ].join('\n');

                if (mode === 'copy') {
                    await navigator.clipboard.writeText(csvContent);
                    toast.success('CSV data copied to clipboard');
                } else {
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${filename}.csv`;
                    link.click();
                }
            } else if (format === 'xlsx') {
                if (mode === 'copy') {
                    // For Excel Copy, we copy TSV
                    const headers = ['Date', 'Date (Short)', 'ISO Date', ...itemHeaders];
                    const tsvContent = [
                        headers.join('\t'),
                        ...dataToExport.map(row => headers.map(header => {
                            const val = row[header] !== undefined ? row[header] : '';
                            return val;
                        }).join('\t'))
                    ].join('\n');
                    await navigator.clipboard.writeText(tsvContent);
                    toast.success('Excel-compatible data copied to clipboard');
                } else {
                    // Use xlsx library
                    const ws = XLSX.utils.json_to_sheet(dataToExport);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Price Data");
                    XLSX.writeFile(wb, `${filename}.xlsx`);
                }
            }
        }
    }));

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
                // Store RAW price in the chart data
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

    // Aggregation Logic - RELAXED
    const getEffectiveResolution = useCallback(() => {
        if (resolution !== 'auto') return resolution;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        if (diffDays <= 365) return 'daily'; // Up to 1 year
        if (diffDays <= 365 * 5) return 'weekly'; // Up to 5 years
        return 'monthly';
    }, [resolution, startDate, endDate]);
    const processedData = useMemo(() => {
        const effectiveRes = getEffectiveResolution();
        if (effectiveRes === 'daily' || !filteredChartData.length) return filteredChartData;

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

        return aggregated;
    }, [filteredChartData, getEffectiveResolution, aggregation, items]);

    // Normalization Effect - Processes data and shows spinner if it takes time
    useEffect(() => {
        if (!processedData.length) {
            setFinalChartData([]);
            setIsNormalizing(false);
            return;
        }

        // If no normalization, just use processedData
        if (!normTargets) {
            setFinalChartData(processedData);
            setIsNormalizing(false);
            return;
        }

        setIsNormalizing(true);

        // Defer calculation slightly to ensure spinner renders if thread blocks
        const id = setTimeout(() => {
            const normalized = processedData.map(d => {
                const entry = { ...d };
                items.forEach(item => {
                    const name = item.name;
                    if (d[name] !== undefined) {
                        entry[name] = getNormalizedPrice(d[name], item.unit, normTargets);
                    }
                    if (d[`${name}_ext`] !== undefined) {
                        entry[`${name}_ext`] = getNormalizedPrice(d[`${name}_ext`], item.unit, normTargets);
                    }
                });
                return entry;
            });

            setFinalChartData(normalized);
            setIsNormalizing(false);
        }, 100);

        return () => clearTimeout(id);
    }, [processedData, normTargets, items]);


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
    }, [filteredChartData, items]);


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
            const item = items.find(i => i.name === name);

            // Use data from finalChartData (pre-normalized)
            const mainData = finalChartData.map(d => d[name]);
            const extData = finalChartData.map(d => d[`${name}_ext`]);

            // Only add series if data exists (forces entrance animation on load)
            const hasMainData = mainData.some(v => v !== undefined && v !== null);
            const hasExtData = extData.some(v => v !== undefined && v !== null);

            if (hasMainData) {
                // Main Line
                series.push({
                    id: name,
                    name: name,
                    type: 'line',
                    data: mainData,
                    itemStyle: { color: color },
                    lineStyle: {
                        width: 2,
                        opacity: hoveredItem && hoveredItem !== name ? 0.2 : 1 // Dim if not hovered from list
                    },
                    showSymbol: false,
                    smooth: true,
                    animation: true, // Force animation
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
            }

            if (hasExtData) {
                // Extended Line (Dashed)
                series.push({
                    id: `${name}_ext`,
                    name: `${name}_ext`,
                    type: 'line',
                    data: extData,
                    itemStyle: { color: color },
                    lineStyle: {
                        type: 'dashed',
                        opacity: hoveredItem && hoveredItem !== name ? 0.1 : 0.5, // Dim even more if not focused
                        width: 2
                    },
                    showSymbol: false,
                    smooth: true,
                    animation: true, // Force animation here too
                    connectNulls: true,
                    z: 1,
                    silent: true,
                    emphasis: { disabled: true }
                });
            }
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
                backgroundColor: isDark ? 'rgba(42, 36, 66, 0.95)' : 'rgba(255, 253, 248, 0.95)',
                borderRadius: 12,
                borderWidth: 0,
                padding: 12,
                textStyle: { color: isDark ? '#B8AED0' : '#5C5247' },
                extraCssText: isDark
                    ? 'box-shadow: 0 10px 15px -3px rgb(30 26 46 / 0.5);'
                    : 'box-shadow: 0 10px 15px -3px rgb(92 82 71 / 0.1);',
                axisPointer: {
                    type: 'line', // Ensure we use a line
                    lineStyle: {
                        color: isDark ? '#4b4f54' : '#97B897',
                        width: 1,
                        type: 'dashed',
                        opacity: 0.4
                    },
                    animation: false // Disable animation to prevent "glitching" or lagging behind cursor
                },
                formatter: (params) => {
                    if (!params.length) return '';
                    const dateIndex = params[0].dataIndex;
                    const dateItem = finalChartData[dateIndex];
                    if (!dateItem) return '';

                    let html = `<div class="font-medium ${isDark ? 'text-[#6B5B95]' : 'text-[#8B7E6B]'} mb-2">${dateItem.fullDate}</div>`;

                    // Filter and sort items by price (highest first)
                    const sortedParams = params
                        .filter(p => !p.seriesName.endsWith('_ext') && p.value !== undefined)
                        .sort((a, b) => b.value - a.value);

                    sortedParams.forEach(p => {
                        const color = p.color;
                        const value = Math.round(p.value);
                        const name = p.seriesName;
                        const item = items.find(i => i.name === name);

                        // Get unit label (normalized if active)
                        let unitLabel = item?.unit || '';
                        if (normTargets && item) {
                            const parsed = parseUnit(item.unit);
                            unitLabel = getTargetUnitLabel(parsed.type, normTargets[parsed.type], item.unit);
                        }

                        // Use the ref directly for instant, lag-free bolding
                        const isHighlighted = name === hoveredItem || name === localHoveredRef.current;

                        html += `
                        <div class="flex items-center justify-between gap-4 text-sm ${isHighlighted ? 'scale-105 origin-left' : ''} transition-all duration-200">
                            <div class="flex items-center gap-2 min-w-0">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${color}; box-shadow: ${isHighlighted ? `0 0 8px ${color}` : 'none'}"></span>
                                <span class="truncate ${isHighlighted ? 'font-bold ' + (isDark ? 'text-white' : 'text-[#2A2442]') : 'font-medium ' + (isDark ? 'text-[#B8AED0]' : 'text-[#8B7E6B]')}">${name}:</span>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                <span class="font-bold ${isHighlighted ? (isDark ? 'text-white' : 'text-[#2A2442]') : (isDark ? 'text-[#B8AED0]' : 'text-[#5C5247]')}">৳${value}</span>
                                <span class="text-[10px] opacity-70 ${isHighlighted ? 'font-bold' : ''}">/${unitLabel}</span>
                            </div>
                        </div>
                    `;
                    });
                    return html;
                }
            },
            xAxis: {
                type: 'category',
                data: finalChartData.map(d => d.dateShort), // Use pre-formatted short dates
                boundaryGap: false,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: isDark ? '#6B5B95' : '#8B7E6B',
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
                splitLine: { show: true, lineStyle: { color: isDark ? '#3D3460' : '#D4E6DC' } },
                axisLabel: {
                    formatter: '৳{value}',
                    color: isDark ? '#6B5B95' : '#8B7E6B',
                    fontSize: 12
                }
            },
            series: series,
            animationDuration: 1500, // Slower entrance animation
            animationDurationUpdate: 0, // Instant updates to prevent axis sliding/morphing
            animationEasing: 'cubicOut',
            animationEasingUpdate: 'cubicOut', // Smooth updates
        };
    }, [items, finalChartData, getItemColor, hoveredItem, startDate, endDate, getEffectiveResolution, isDark]);


    // Manual Option Management for 'replaceMerge'
    // We use this to ensure that adding/removing items animates correctly (new items grow in, removed items fade out)
    // and avoids "ghost" series or full re-renders.
    useEffect(() => {
        const chart = echartsRef.current?.getEchartsInstance();
        if (chart && option) {
            chart.setOption(option, {
                replaceMerge: ['series'],
                // NOT merge: false (we want to merge, but replace series list)
            });
        }
    }, [option]);

    // Helper for dropdown text
    const getDensityLabel = () => {
        if (resolution === 'auto') {
            const effective = getEffectiveResolution();
            // Capitalize effective
            const cap = effective.charAt(0).toUpperCase() + effective.slice(1);
            return `Auto (${cap})`;
        }
        // Capitalize first letter
        return resolution.charAt(0).toUpperCase() + resolution.slice(1);
    };

    if (loading && items.length > 0 && chartData.length === 0) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center bg-[#FFFDF8] dark:bg-[#2A2442] rounded-2xl border border-[#D4E6DC] dark:border-[#4A3F6B] transition-colors duration-300">
                <Loader2 className="w-8 h-8 text-[#7A9F7A] dark:text-[#9D8EC9] animate-spin mb-2" />
                <span className="text-sm text-[#8B7E6B] dark:text-[#6B5B95]">{loadingItem ? `Loading ${loadingItem}...` : 'Loading...'}</span>
            </div>
        );
    }

    if (items.length > 0 && chartData.length === 0 && !loading) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center bg-[#FFFDF8] dark:bg-[#2A2442] rounded-2xl border border-[#D4E6DC] dark:border-[#4A3F6B] text-red-400 dark:text-red-500 transition-colors duration-300">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">No history found.</span>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="bg-[#FFFDF8] dark:bg-[#2A2442] p-6 rounded-2xl shadow-sm border border-[#D4E6DC] dark:border-[#4A3F6B] relative transition-colors duration-300">
            {isNormalizing && (
                <div className="absolute inset-0 z-20 bg-[#FFFDF8]/40 dark:bg-[#2A2442]/40 backdrop-blur-[2px] flex items-center justify-center rounded-2xl animate-in fade-in duration-300">
                    <div className="bg-[#FFFDF8] dark:bg-[#2A2442] px-6 py-4 rounded-2xl shadow-2xl border border-[#D4E6DC] dark:border-[#4A3F6B] flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-[#7A9F7A] dark:text-[#9D8EC9] animate-spin" />
                        <span className="text-sm font-bold text-[#5C5247] dark:text-white">Normalizing Units...</span>
                        <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95]">Applying custom quantities</span>
                    </div>
                </div>
            )}
            {loadingItem && chartData.length > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#D4E6DC] dark:bg-[#3D3460] text-[#7A9F7A] dark:text-[#9D8EC9] px-3 py-1.5 rounded-full text-xs font-medium z-10 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Adding {loadingItem}...
                </div>
            )}

            {/* Header */}
            {/* UPDATED LAYOUT: Left = Density | Aggregation, Right = Date Range */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">

                {/* Left Side: Density & Aggregation */}
                <div className="flex items-center gap-4">

                    {/* Density Dropdown (MOVED LEFT) */}
                    <div className="flex items-center gap-2">
                        <Tooltip content={
                            resolution === 'auto' ? 'Frequency adjusts based on range' :
                                resolution === 'daily' ? 'One point per day' :
                                    resolution === 'weekly' ? 'One point per week' :
                                        resolution === 'monthly' ? 'One point per month' :
                                            'One point per year'
                        }>
                            <span className="text-xs font-medium text-[#8B7E6B] dark:text-[#6B5B95] uppercase tracking-wider cursor-help border-b border-dashed border-[#D4E6DC] dark:border-[#4A3F6B]">Density:</span>
                        </Tooltip>

                        <div className="relative">
                            <button
                                onClick={() => setIsDensityOpen(!isDensityOpen)}
                                onBlur={() => setTimeout(() => setIsDensityOpen(false), 200)}
                                className="flex items-center gap-2 bg-[#F5E6D3] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] text-[#5C5247] dark:text-[#B8AED0] text-sm rounded-lg hover:border-[#97B897] dark:hover:border-[#6B5B95] hover:bg-[#D4E6DC]/30 dark:hover:bg-[#4A3F6B] px-3 py-1.5 transition-all w-32 justify-between"
                            >
                                <span className="truncate">{getDensityLabel()}</span>
                                <ChevronDown size={14} className="text-[#8B7E6B] dark:text-[#6B5B95] flex-shrink-0" />
                            </button>

                            {/* Custom Dropdown Menu */}
                            {isDensityOpen && (
                                <div className="absolute top-full left-0 mt-1 w-32 bg-[#FFFDF8] dark:bg-[#2A2442] rounded-lg shadow-xl dark:shadow-[#1E1A2E]/50 border border-[#D4E6DC] dark:border-[#4A3F6B] py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {['auto', 'daily', 'weekly', 'monthly', 'yearly'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                setResolution(opt);
                                                setIsDensityOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460] transition-colors ${resolution === opt ? 'text-[#7A9F7A] dark:text-[#9D8EC9] font-medium bg-[#D4E6DC]/30 dark:bg-[#3D3460]' : 'text-[#5C5247] dark:text-[#B8AED0]'}`}
                                        >
                                            {opt === 'auto' ? 'Auto' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aggregation (MOVED RIGHT OF DENSITY) */}
                    {getEffectiveResolution() !== 'daily' && (
                        <div className="flex bg-[#F5E6D3] dark:bg-[#3D3460] rounded-lg p-1">
                            {['avg', 'min', 'max'].map(mode => (
                                <Tooltip key={mode} content={mode === 'avg' ? 'Average Price' : mode === 'min' ? 'Lowest Price' : 'Highest Price'}>
                                    <button
                                        onClick={() => setAggregation(mode)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${aggregation === mode
                                            ? 'bg-[#FFFDF8] dark:bg-[#6B5B95] text-[#7A9F7A] dark:text-white shadow-sm ring-1 ring-[#D4E6DC] dark:ring-[#4A3F6B]'
                                            : 'text-[#8B7E6B] dark:text-[#B8AED0] hover:text-[#5C5247] dark:hover:text-white hover:bg-[#D4E6DC]/30 dark:hover:bg-[#4A3F6B]'
                                            }`}
                                    >
                                        {mode === 'avg' ? 'Avg' : mode === 'min' ? 'Low' : 'High'}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    )}

                </div>

                {/* Right Side: Date Range */}
                <div className="flex items-center gap-2 bg-[#F5E6D3] dark:bg-[#3D3460] rounded-xl px-3 py-2 border border-[#D4E6DC] dark:border-[#4A3F6B]">
                    <Calendar className="w-4 h-4 text-[#7A9F7A] dark:text-[#9D8EC9] flex-shrink-0" />
                    <Tooltip content="Select start date">
                        <DateInput
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            label="Start date"
                            max={endDate}
                        />
                    </Tooltip>
                    <span className="text-[#8B7E6B] dark:text-[#6B5B95] text-sm font-medium">to</span>
                    <Tooltip content="Select end date">
                        <DateInput
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            label="End date"
                            min={startDate}
                            max={today}
                        />
                    </Tooltip>
                </div>

            </div>

            <div className="h-[400px] w-full">
                <ReactECharts
                    ref={echartsRef}
                    option={{}} // Controlled manually via useEffect
                    style={{ height: '100%', width: '100%' }}
                    onChartReady={(chart) => {
                        chart.setOption(option, { replaceMerge: ['series'] });
                    }}
                    onEvents={{
                        'mousemove': (params) => {
                            const chart = echartsRef.current?.getEchartsInstance();
                            if (!chart) return;

                            const pointInPixel = [params.event.zrX, params.event.zrY];
                            if (chart.containPixel('grid', pointInPixel)) {
                                const pointInData = chart.convertFromPixel('grid', pointInPixel);
                                const xIndex = Math.round(pointInData[0]);
                                const mousePrice = pointInData[1];

                                if (xIndex >= 0 && xIndex < finalChartData.length) {
                                    let closestName = null;
                                    let minDiff = Infinity;

                                    items.forEach(item => {
                                        const row = finalChartData[xIndex];
                                        if (!row) return;

                                        // Data in finalChartData is already normalized
                                        const displayPrice = row[item.name] !== undefined ? row[item.name] : row[`${item.name}_ext`];
                                        if (displayPrice === undefined || displayPrice === null) return;

                                        const diff = Math.abs(displayPrice - mousePrice);

                                        // Use a small bias to prefer current hover if distances are nearly identical
                                        const bias = (item.name === localHoveredRef.current) ? 0.95 : 1.0;

                                        if (diff * bias < minDiff) {
                                            minDiff = diff;
                                            closestName = item.name;
                                        }
                                    });

                                    // Update Ref immediately - no React re-render needed for tooltip bolding
                                    localHoveredRef.current = closestName;
                                }
                            } else {
                                localHoveredRef.current = null;
                            }
                        },
                        'globalout': () => {
                            localHoveredRef.current = null;
                        }
                    }}
                />
            </div>

            {/* Footer Info */}
            <div className="mt-4 flex justify-between items-center text-xs text-[#8B7E6B] dark:text-[#6B5B95] border-t border-[#D4E6DC]/50 dark:border-[#3D3460] pt-3">
                <p>{items.length} item{items.length > 1 ? 's' : ''} active</p>
                <p>{finalChartData.length} data points shown</p>
            </div>

        </div>
    );
});

export default PriceChartECharts;
