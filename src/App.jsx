import { useState, useRef, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChartECharts';
import DevSourceToggle from './components/DevSourceToggle';
import EmptyStateSkeleton from './components/EmptyStateSkeleton';
import ThemeToggle from './components/ThemeToggle';
import BuildInfo from './components/BuildInfo';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, X, Trash2, ArrowDownWideNarrow, ArrowUp, ArrowDown, Download, FileJson, FileSpreadsheet, Image as ImageIcon, FileText, Copy } from 'lucide-react';
import { useMemo } from 'react';
import { DATA_BASE_URL } from './config';
import { Toaster } from 'sonner';
import ItemHoverCard from './components/ItemHoverCard';
import ItemDetailModal from './components/ItemDetailModal';
import { ChevronRight, Scale } from 'lucide-react';
import clsx from 'clsx';
import { getNormalizedPrice, getTargetUnitLabel, parseUnit } from './utils/quantityUtils';

// Extended color palette for unlimited comparisons
const COLORS = [
  { stroke: '#3B82F6', fill: '#3B82F6' }, // Blue
  { stroke: '#10B981', fill: '#10B981' }, // Emerald
  { stroke: '#F59E0B', fill: '#F59E0B' }, // Amber
  { stroke: '#EF4444', fill: '#EF4444' }, // Red
  { stroke: '#8B5CF6', fill: '#8B5CF6' }, // Purple
  { stroke: '#EC4899', fill: '#EC4899' }, // Pink
  { stroke: '#06B6D4', fill: '#06B6D4' }, // Cyan
  { stroke: '#84CC16', fill: '#84CC16' }, // Lime
  { stroke: '#F97316', fill: '#F97316' }, // Orange
  { stroke: '#6366F1', fill: '#6366F1' }, // Indigo
  { stroke: '#14B8A6', fill: '#14B8A6' }, // Teal
  { stroke: '#A855F7', fill: '#A855F7' }, // Violet
];

function App() {
  // 1. Start DuckDB in background
  useDuckDB();

  // Array for multi-item comparison (no limit)
  const [selectedItems, setSelectedItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [itemStats, setItemStats] = useState({});
  const [isSorted, setIsSorted] = useState(false);
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [hoveredItemObj, setHoveredItemObj] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sideRect, setSideRect] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [normTargets, setNormTargets] = useState({
    mass: 1,
    volume: 1,
    count: 1,
    enabled: false
  });

  const compareListRef = useRef(null);
  const chartRef = useRef(null);

  // Detect touch device to disable hover
  const isTouchDevice = useMemo(() => {
    return (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  }, []);

  // Optimize stats update to prevent infinite loops if reference unstable
  const handleStatsUpdate = useCallback((newStats) => {
    // Convert array to object for easier lookup: { name: stat }
    const statsMap = newStats.reduce((acc, stat) => {
      acc[stat.name] = stat;
      return acc;
    }, {});

    // Only update if changed (deep comparison or length check + key check?)
    // JSON stringify is cheap enough for small number of items
    setItemStats(prev => {
      if (JSON.stringify(prev) === JSON.stringify(statsMap)) return prev;
      return statsMap;
    });
  }, []);

  // Persistent color assignments - each item keeps its color even after others are removed
  const colorAssignmentsRef = useRef(new Map());
  const nextColorIndexRef = useRef(0);

  // Get or assign a persistent color for an item
  const getItemColor = useCallback((itemName) => {
    if (colorAssignmentsRef.current.has(itemName)) {
      return colorAssignmentsRef.current.get(itemName);
    }
    // Assign next available color
    const colorIndex = nextColorIndexRef.current % COLORS.length;
    const color = COLORS[colorIndex];
    colorAssignmentsRef.current.set(itemName, color);
    nextColorIndexRef.current++;
    return color;
  }, []);

  // Add item to comparison (no limit)
  const handleAddItem = useCallback((item) => {
    if (!item) return;
    // Check if already selected
    setSelectedItems(prev => {
      if (prev.some(i => i.name === item.name)) return prev;
      // Pre-assign color when item is added
      getItemColor(item.name);
      return [...prev, item];
    });
  }, [getItemColor]);

  // Remove item from comparison
  const handleRemoveItem = useCallback((itemName) => {
    setSelectedItems(prev => prev.filter(i => i.name !== itemName));
    if (hoveredItemObj?.name === itemName) {
      setHoveredItemObj(null);
    }
  }, [hoveredItemObj]);

  // Clear all items
  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
    // Reset color assignments when all items are cleared
    colorAssignmentsRef.current.clear();
    nextColorIndexRef.current = 0;
  }, []);

  const sortedItems = useMemo(() => {
    if (!isSorted) return selectedItems;

    return [...selectedItems].sort((a, b) => {
      // Use current price from stats if available, otherwise fallback to item price, then 0
      let priceA = itemStats[a.name]?.current ?? a.price ?? 0;
      let priceB = itemStats[b.name]?.current ?? b.price ?? 0;

      if (normTargets.enabled) {
        priceA = getNormalizedPrice(priceA, a.unit, normTargets);
        priceB = getNormalizedPrice(priceB, b.unit, normTargets);
      }

      return sortDirection === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }, [selectedItems, isSorted, sortDirection, itemStats, normTargets]);

  return (
    <div className="min-h-screen bg-[#F5E6D3] dark:bg-[#1E1A2E] font-sans text-[#5C5247] dark:text-[#B8AED0] transition-colors duration-300">

      {/* --- HEADER SECTION --- */}
      <div className="bg-[#FFFDF8] dark:bg-[#2A2442] border-b border-[#D4E6DC] dark:border-[#4A3F6B] shadow-sm sticky top-0 z-30 transition-colors duration-300">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#97B897] dark:bg-[#6B5B95] p-2 rounded-lg text-white">
                <TrendingUp size={24} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#5C5247] dark:text-white">
                DaamTrack<span className="text-[#7A9F7A] dark:text-[#9D8EC9]">BD</span>
              </h1>
            </div>

            {/* Dev Data Source Toggle */}
            <DevSourceToggle />
          </div>

          {/* Search Bar and Theme Toggle (Right Side) */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block w-96">
              <SearchBar
                onSelect={handleAddItem}
                selectedItems={selectedItems}
                normTargets={normTargets.enabled ? normTargets : null}
                itemStats={itemStats}
              />
            </div>

            {/* Export Button */}
            <div className="relative group">
              <button
                className="p-2 rounded-lg bg-[#FFFDF8] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] text-[#5C5247] dark:text-[#B8AED0] hover:bg-[#D4E6DC]/30 dark:hover:bg-[#4A3F6B] transition-colors"
                title="Export Chart & Data"
              >
                <Download size={20} />
              </button>

              {/* Export Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#FFFDF8] dark:bg-[#2A2442] rounded-xl shadow-xl dark:shadow-[#1E1A2E]/50 border border-[#D4E6DC] dark:border-[#4A3F6B] py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
                <div className="px-3 py-2 border-b border-[#D4E6DC]/50 dark:border-[#3D3460]">
                  <span className="text-xs font-semibold text-[#8B7E6B] dark:text-[#6B5B95] uppercase tracking-wider">Export As</span>
                </div>

                {/* Image (PNG) */}
                <div className="flex items-center hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460] transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportImage('download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-[#5C5247] dark:text-[#B8AED0] flex items-center gap-2"
                  >
                    <ImageIcon size={14} className="text-[#3B82F6]" />
                    <span>Image (PNG)</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportImage('copy')}
                    className="p-2 mr-2 text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0] opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy Image to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* Excel (XLSX) */}
                <div className="flex items-center hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460] transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('xlsx', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-[#5C5247] dark:text-[#B8AED0] flex items-center gap-2"
                  >
                    <FileSpreadsheet size={14} className="text-[#10B981]" />
                    <span>Excel (XLSX)</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('xlsx', 'copy')}
                    className="p-2 mr-2 text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0] opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy Data (TSV) to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* CSV File */}
                <div className="flex items-center hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460] transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('csv', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-[#5C5247] dark:text-[#B8AED0] flex items-center gap-2"
                  >
                    <FileText size={14} className="text-[#F59E0B]" />
                    <span>CSV File</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('csv', 'copy')}
                    className="p-2 mr-2 text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0] opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy CSV to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* JSON Data */}
                <div className="flex items-center hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460] transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('json', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-[#5C5247] dark:text-[#B8AED0] flex items-center gap-2"
                  >
                    <FileJson size={14} className="text-[#8B5CF6]" />
                    <span>JSON Data</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('json', 'copy')}
                    className="p-2 mr-2 text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0] opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy JSON to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

              </div>
            </div>

            <ThemeToggle />
          </div>

        </div>
      </div>

      {/* --- MOBILE SEARCH (Visible only on small screens) --- */}
      <div className="md:hidden p-4 bg-[#FFFDF8] dark:bg-[#2A2442] border-b border-[#D4E6DC] dark:border-[#4A3F6B] transition-colors duration-300">
        <SearchBar
          onSelect={handleAddItem}
          selectedItems={selectedItems}
          normTargets={normTargets.enabled ? normTargets : null}
          itemStats={itemStats}
        />
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {selectedItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Left Column: Chart (3/4 width) */}
            <div className="lg:col-span-3">
              <PriceChart
                ref={chartRef}
                items={selectedItems}
                colors={COLORS}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                onStatsUpdate={handleStatsUpdate}
                normTargets={normTargets.enabled ? normTargets : null}
              />
            </div>

            {/* Right Column: Selected Items List (1/4 width) */}
            <div className="lg:col-span-1">
              <div className="bg-[#FFFDF8] dark:bg-[#2A2442] rounded-2xl shadow-sm border border-[#D4E6DC] dark:border-[#4A3F6B] sticky top-24 transition-colors duration-300">
                {/* Header */}
                <div className="p-4 border-b border-[#D4E6DC]/50 dark:border-[#3D3460] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#5C5247] dark:text-white">Comparing</h3>
                    <p className="text-xs text-[#8B7E6B] dark:text-[#6B5B95]">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  {selectedItems.length > 1 && (
                    <div className="flex items-center gap-2">
                      {/* Sort Controls */}
                      <div className="flex items-center bg-[#F5E6D3] dark:bg-[#3D3460] rounded-lg p-0.5 border border-[#D4E6DC] dark:border-[#4A3F6B]">
                        <button
                          onClick={() => setIsSorted(!isSorted)}
                          className={`p-1.5 rounded-md transition-all ${isSorted ? 'bg-[#FFFDF8] dark:bg-[#6B5B95] text-[#7A9F7A] dark:text-white shadow-sm' : 'text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0]'}`}
                          title={isSorted ? "Turn sort off" : "Sort by price"}
                        >
                          <ArrowDownWideNarrow size={14} />
                        </button>

                        {isSorted && (
                          <button
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 rounded-md text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#7A9F7A] dark:hover:text-[#9D8EC9] hover:bg-[#FFFDF8]/50 dark:hover:bg-[#3D3460] transition-all"
                            title={sortDirection === 'asc' ? "Lowest first" : "Highest first"}
                          >
                            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          </button>
                        )}
                      </div>

                      <div className="w-px h-4 bg-[#D4E6DC] dark:bg-[#4A3F6B] mx-1"></div>

                      <button
                        onClick={handleClearAll}
                        className="text-xs px-2 py-1.5 rounded-md text-[#8B7E6B] dark:text-[#6B5B95] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        title="Clear all items"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Normalization Controls */}
                <div className="p-4 border-b border-[#D4E6DC]/50 dark:border-[#3D3460] bg-[#F5E6D3]/20 dark:bg-[#1E1A2E]/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className={normTargets.enabled ? "text-[#7A9F7A] dark:text-[#9D8EC9]" : "text-[#8B7E6B] dark:text-[#6B5B95]"} />
                      <span className="text-sm font-semibold text-[#5C5247] dark:text-white">Normalize Units</span>
                    </div>
                    <button
                      onClick={() => setNormTargets(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        normTargets.enabled ? "bg-[#7A9F7A] dark:bg-[#6B5B95]" : "bg-[#D4E6DC] dark:bg-[#3D3460]"
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {normTargets.enabled && (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {[
                        { label: 'Weight', key: 'mass', unit: 'kg' },
                        { label: 'Volume', key: 'volume', unit: 'L' },
                        { label: 'Count', key: 'count', unit: 'pcs' },
                      ].map((type) => (
                        <div key={type.key} className="flex items-center justify-between gap-4">
                          <label className="text-xs font-medium text-[#8B7E6B] dark:text-[#6B5B95]">{type.label}</label>
                          <div className="flex items-center bg-white dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-lg px-2 py-1 shadow-sm">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={normTargets[type.key]}
                              onChange={(e) => setNormTargets(prev => ({ ...prev, [type.key]: parseInt(e.target.value, 10) || 0 }))}
                              className="w-12 text-right text-xs font-bold bg-transparent border-none focus:ring-0 text-[#5C5247] dark:text-white p-0"
                            />
                            <span className="text-[10px] font-bold text-[#8B7E6B] dark:text-[#6B5B95] border-l border-[#D4E6DC] dark:border-[#4A3F6B] ml-2 pl-2">{type.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <ul
                  ref={compareListRef}
                  className="max-h-[60vh] overflow-y-auto divide-y divide-[#D4E6DC]/30 dark:divide-[#3D3460] scrollbar-thin scrollbar-thumb-[#D4E6DC] dark:scrollbar-thumb-[#4A3F6B] scrollbar-track-transparent hover:scrollbar-thumb-[#97B897] dark:hover:scrollbar-thumb-[#6B5B95] pr-1"
                >
                  {sortedItems.map((item) => {
                    const itemColor = getItemColor(item.name);
                    return (
                      <li
                        key={item.name}
                        onMouseEnter={() => {
                          setHoveredItem(item.name);
                          if (!isTouchDevice) {
                            setHoveredItemObj(item);
                            if (compareListRef.current) {
                              setSideRect(compareListRef.current.getBoundingClientRect());
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredItem(null);
                          if (!isTouchDevice) {
                            setHoveredItemObj(null);
                            setSideRect(null);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (!isTouchDevice) {
                            setMousePos({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        className={`p-3.5 transition-colors group cursor-pointer relative ${hoveredItem === item.name ? 'bg-[#D4E6DC]/40 dark:bg-[#3D3460] shadow-sm border-l-4 border-l-[#97B897] dark:border-l-[#6B5B95]' : 'hover:bg-[#F5E6D3]/50 dark:hover:bg-[#3D3460]/50 border-l-4 border-l-transparent'}`}
                      >
                        <div className="flex gap-3 items-start">
                          {/* Column 1: Image with Color Badge Overlay */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-[#F5E6D3] dark:bg-[#3D3460] flex items-center justify-center overflow-hidden border border-[#D4E6DC] dark:border-[#4A3F6B] shadow-sm group-hover:scale-105 transition-transform duration-200">
                              <img
                                src={`${DATA_BASE_URL}/images/${item.image}`}
                                alt={item.name}
                                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-90"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div
                              className="absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-[#FFFDF8] dark:border-[#2A2442] shadow-sm z-10"
                              style={{ backgroundColor: itemColor.stroke }}
                            />
                          </div>

                          {/* Column 2: Info & Actions */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            {/* Row 1: Item Name */}
                            <h4 className="text-sm font-bold text-[#5C5247] dark:text-white truncate leading-snug" title={item.name}>
                              {item.name}
                            </h4>

                            {/* Row 2: Stats and Actions Row */}
                            <div className="flex items-end justify-between gap-1 mt-0.5">
                              {/* Sub-column 1: Price and Range */}
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm sm:text-base font-black text-[#5C5247] dark:text-white">
                                    ৳{normTargets.enabled
                                      ? Math.round(getNormalizedPrice(itemStats[item.name]?.current ?? item.price ?? 0, item.unit, normTargets))
                                      : (itemStats[item.name]?.current ?? item.price ?? 0)}
                                    <span className="text-xs opacity-70 font-bold ml-0.5">
                                      /{normTargets.enabled
                                        ? getTargetUnitLabel(parseUnit(item.unit).type, normTargets[parseUnit(item.unit).type], item.unit)
                                        : item.unit}
                                    </span>
                                  </span>
                                  {itemStats[item.name] && itemStats[item.name].change !== 0 && (
                                    <span className={clsx(
                                      "text-[10px] sm:text-xs font-bold px-1.5 rounded-md flex items-center h-5 shadow-sm",
                                      itemStats[item.name].change > 0 ? "text-red-600 bg-red-50 dark:bg-red-900/40 border border-red-100 dark:border-red-800/30" :
                                        "text-[#4A6B4A] bg-[#D4E6DC] dark:bg-green-900/40 border border-[#D4E6DC] dark:border-green-800/30"
                                    )}>
                                      {itemStats[item.name].change > 0 ? '▲' : '▼'}
                                      {normTargets.enabled
                                        ? Math.round(getNormalizedPrice(Math.abs(itemStats[item.name].change), item.unit, normTargets))
                                        : Math.abs(itemStats[item.name].change)}
                                    </span>
                                  )}
                                </div>

                              </div>

                              {/* Sub-column 2: Action Buttons */}
                              <div className="flex items-center gap-1 shrink-0 pb-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailItem(item);
                                  }}
                                  className="text-[#8B7E6B] dark:text-[#6B5B95] border border-[#D4E6DC] dark:border-[#4A3F6B] hover:bg-[#D4E6DC]/50 dark:hover:bg-[#3D3460]/80 hover:text-[#7A9F7A] dark:hover:text-[#9D8EC9] transition-all p-1 rounded-md shadow-sm bg-white/50 dark:bg-[#3D3460]/30"
                                  title="View Details"
                                >
                                  <ChevronRight size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.name);
                                  }}
                                  className="text-[#8B7E6B] dark:text-[#6B5B95] border border-red-100 dark:border-red-900/30 ring-1 ring-red-500/10 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-all p-1 rounded-md shadow-sm bg-white/50 dark:bg-[#3D3460]/30"
                                  title="Remove item"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer hint */}
                <div className="p-3 border-t border-[#D4E6DC]/50 dark:border-[#3D3460] bg-[#F5E6D3]/30 dark:bg-[#1E1A2E]/50 rounded-b-2xl transition-colors duration-300">
                  <p className="text-xs text-[#8B7E6B] dark:text-[#6B5B95] text-center">
                    Search to add more items
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Empty State */
          <EmptyStateSkeleton />
        )}

      </div>
      <BuildInfo />
      <Toaster position="bottom-right" theme="system" />

      {/* Hover & Details Overlay Components */}
      <ItemHoverCard
        item={hoveredItemObj}
        mousePos={mousePos}
        sideRect={sideRect}
        normTargets={normTargets.enabled ? normTargets : null}
        stats={hoveredItemObj ? itemStats[hoveredItemObj.name] : null}
      />
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        normTargets={normTargets.enabled ? normTargets : null}
        stats={detailItem ? itemStats[detailItem.name] : null}
      />
    </div>
  );
}

export default App;