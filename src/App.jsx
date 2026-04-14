import { useState, useRef, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChartECharts';
import DevControls from './components/DevControls';
import EmptyStateSkeleton from './components/EmptyStateSkeleton';
import ThemeToggle from './components/ThemeToggle';
import BuildInfo from './components/BuildInfo';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, X, Trash2, ArrowDownWideNarrow, ArrowUp, ArrowDown, Download, FileJson, FileSpreadsheet, Image as ImageIcon, FileText, Copy } from 'lucide-react';
import { useMemo } from 'react';
import { DATA_BASE_URL } from './config';
import { Toaster, toast } from 'sonner';
import ItemHoverCard from './components/ItemHoverCard';
import ItemDetailModal from './components/ItemDetailModal';
import CommandBar from './components/CommandBar';
import StatsSidebar from './components/StatsSidebar';
import ItemDetailsPanel from './components/ItemDetailsPanel';
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
  const [isSorted, setIsSorted] = useState(true);
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [hoveredItemObj, setHoveredItemObj] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sideRect, setSideRect] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [selectedDetailItemName, setSelectedDetailItemName] = useState(null);
  const [normTargets, setNormTargets] = useState({
    mass: 1,
    volume: 1,
    count: 1,
    enabled: false
  });

  const compareListRef = useRef(null);
  const chartRef = useRef(null);

  // 1a. Fetch Product Catalog (Meta Index)
  const [allItems, setAllItems] = useState([]);
  const [isMetaLoading, setIsMetaLoading] = useState(true);

  useEffect(() => {
    fetch(`${DATA_BASE_URL}/data/meta.json`)
      .then(res => res.json())
      .then(data => {
        setAllItems(data);
        setIsMetaLoading(false);
      })
      .catch(err => {
        console.error("Failed to load product catalog:", err);
        setIsMetaLoading(false);
      });
  }, []);

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

  // Bulk add items (useful for dev/exploration)
  const handleBulkAdd = useCallback((newItems) => {
    if (!newItems || newItems.length === 0) return;
    
    setSelectedItems(prev => {
      const existingNames = new Set(prev.map(i => i.name));
      const filteredNewItems = newItems.filter(item => !existingNames.has(item.name));
      
      if (filteredNewItems.length === 0) return prev;
      
      // Assign colors for all new items
      filteredNewItems.forEach(item => getItemColor(item.name));
      
      return [...prev, ...filteredNewItems];
    });
  }, [getItemColor]);

  // Remove item from comparison
  const handleRemoveItem = useCallback((itemName) => {
    setSelectedItems(prev => prev.filter(i => i.name !== itemName));
    if (hoveredItemObj?.name === itemName) {
      setHoveredItemObj(null);
    }
    if (selectedDetailItemName === itemName) {
      setSelectedDetailItemName(null);
    }
  }, [hoveredItemObj, selectedDetailItemName]);

  // Clear all items
  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
    setSelectedDetailItemName(null);
    // Reset color assignments when all items are cleared
    colorAssignmentsRef.current.clear();
    nextColorIndexRef.current = 0;
  }, []);

  const handleResetView = useCallback(() => {
    // This could reset Zoom or Date range if exposed by the chart
    if (chartRef.current) {
        // We'll just toast for now or trigger a chart method if it exists
        toast.info("Resetting view...");
    }
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
                Daam<span className="text-[#7A9F7A] dark:text-[#9D8EC9]">Trace</span>
              </h1>
            </div>

            {/* Advanced Dev Controls (Quick Add + Data Source) */}
            <DevControls 
              allItems={allItems} 
              selectedItems={selectedItems} 
              onAddItems={handleBulkAdd} 
            />
          </div>

          {/* Search Bar and Theme Toggle (Right Side) */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block w-96">
              <SearchBar
                onSelect={handleAddItem}
                items={allItems}
                loading={isMetaLoading}
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
          items={allItems}
          loading={isMetaLoading}
          selectedItems={selectedItems}
          normTargets={normTargets.enabled ? normTargets : null}
          itemStats={itemStats}
        />
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 lg:px-4 py-6">

        {/* --- COMMAND & SELECTION BAR --- */}
        <div className="flex flex-col gap-4 mb-6">
          <CommandBar
            normTargets={normTargets}
            onUpdateNorm={setNormTargets}
            onClearAll={handleClearAll}
            onResetView={handleResetView}
          />
        </div>

        {selectedItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">

            {/* Column 1: Chart (Flexible) */}
            <div className="lg:col-span-6 xl:col-span-7 min-h-[500px]">
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

            {/* Column 2: Stats Sidebar (Fixed-ish) */}
            <div className="lg:col-span-3 xl:col-span-2">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8B7E6B] dark:text-[#6B5B95]">Comparison</h3>
                  <div className="flex items-center bg-[#F5E6D3] dark:bg-[#3D3460] rounded-lg p-0.5 border border-[#D4E6DC] dark:border-[#4A3F6B]">
                    <button
                      onClick={() => setIsSorted(!isSorted)}
                      className={`p-1 rounded-md transition-all ${isSorted ? 'bg-white dark:bg-[#6B5B95] text-[#7A9F7A] dark:text-white shadow-sm' : 'text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0]'}`}
                      title={isSorted ? "Turn sort off" : "Sort by price"}
                    >
                      <ArrowDownWideNarrow size={12} />
                    </button>
                    {isSorted && (
                      <button
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1 rounded-md text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#7A9F7A] dark:hover:text-[#9D8EC9] hover:bg-white/50 dark:hover:bg-[#3D3460] transition-all"
                        title={sortDirection === 'asc' ? "Lowest first" : "Highest first"}
                      >
                        {sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>
                
                <StatsSidebar
                  items={sortedItems}
                  stats={Object.values(itemStats)}
                  colors={COLORS}
                  normTargets={normTargets.enabled ? normTargets : null}
                  onRemove={(item) => handleRemoveItem(item.name)}
                  onHover={setHoveredItem}
                  selectedItemName={selectedDetailItemName}
                  onSelect={(name) => setSelectedDetailItemName(prev => prev === name ? null : name)}
                />
              </div>
            </div>

            {/* Column 3: Details Panel */}
            <div className="lg:col-span-3 xl:col-span-3">
              <div className="sticky top-24">
                <ItemDetailsPanel
                  item={selectedItems.find(i => i.name === selectedDetailItemName)}
                  stats={itemStats[selectedDetailItemName]}
                  normTargets={normTargets.enabled ? normTargets : null}
                  onClose={() => setSelectedDetailItemName(null)}
                  onRemove={(item) => handleRemoveItem(item.name)}
                />
              </div>
            </div>

          </div>
        ) : (
          /* Empty State */
          <div className="mt-12">
            <EmptyStateSkeleton />
          </div>
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