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
  const [isExportOpen, setIsExportOpen] = useState(false);

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
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">

      {/* --- HEADER SECTION --- */}
      <div className="bg-muted border-b border-border shadow-sm sticky top-0 z-30 transition-colors duration-300 motion-preset-fade motion-duration-300">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between md:grid md:grid-cols-3 gap-4">

          {/* Logo */}
          <div className="flex items-center gap-4 justify-start">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg text-white">
                <TrendingUp size={24} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Daam<span className="text-primary">Trace</span>
              </h1>
            </div>

            {/* Advanced Dev Controls (Quick Add + Data Source) */}
            <DevControls 
              allItems={allItems} 
              selectedItems={selectedItems} 
              onAddItems={handleBulkAdd} 
            />
          </div>

          {/* Center: Search Bar */}
          <div className="hidden md:flex justify-center w-full">
            <div className="w-full max-w-lg lg:max-w-xl">
              <SearchBar
                onSelect={handleAddItem}
                items={allItems}
                loading={isMetaLoading}
                selectedItems={selectedItems}
                normTargets={normTargets.enabled ? normTargets : null}
                itemStats={itemStats}
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-3">
            {/* Export Button */}
            <div
              className="relative"
              onMouseEnter={() => setIsExportOpen(true)}
              onMouseLeave={() => setIsExportOpen(false)}
            >
              <button
                className="p-2 rounded-lg bg-muted border border-border text-foreground hover:bg-accent transition-colors"
                title="Export Chart & Data"
              >
                <Download size={20} />
              </button>

              {/* Export Dropdown */}
              {isExportOpen && (
              <div className="absolute right-0 z-50 pointer-events-none" style={{ top: 'calc(100% - 20px)' }}>
                <div className="pt-7 pointer-events-auto">
                <div className="w-56 bg-muted rounded-xl shadow-xl border border-border py-1 motion-preset-blur-down motion-duration-200 pointer-events-auto">
                <div className="px-3 py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export As</span>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">Add items to the comparison list to enable export.</p>
                  </div>
                ) : (<>

                {/* Image (PNG) */}
                <div className="flex items-center hover:bg-accent transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportImage('download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-foreground flex items-center gap-2"
                  >
                    <ImageIcon size={14} className="text-blue-500" />
                    <span>Image (PNG)</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportImage('copy')}
                    className="p-2 mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy Image to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* Excel (XLSX) */}
                <div className="flex items-center hover:bg-accent transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('xlsx', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-foreground flex items-center gap-2"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500" />
                    <span>Excel (XLSX)</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('xlsx', 'copy')}
                    className="p-2 mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy Data (TSV) to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* CSV File */}
                <div className="flex items-center hover:bg-accent transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('csv', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-foreground flex items-center gap-2"
                  >
                    <FileText size={14} className="text-amber-500" />
                    <span>CSV File</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('csv', 'copy')}
                    className="p-2 mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy CSV to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* JSON Data */}
                <div className="flex items-center hover:bg-accent transition-colors group/item">
                  <button
                    onClick={() => chartRef.current?.exportData('json', 'download')}
                    className="flex-1 text-left px-4 py-2.5 text-sm md:text-xs text-foreground flex items-center gap-2"
                  >
                    <FileJson size={14} className="text-purple-500" />
                    <span>JSON Data</span>
                  </button>
                  <button
                    onClick={() => chartRef.current?.exportData('json', 'copy')}
                    className="p-2 mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="Copy JSON to Clipboard"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                </>)}

              </div>
              </div>
              </div>
              )}
            </div>

            <ThemeToggle />
          </div>

        </div>
      </div>

      {/* --- MOBILE SEARCH (Visible only on small screens) --- */}
      <div className="md:hidden p-4 bg-muted border-b border-border transition-colors duration-300 motion-preset-fade motion-duration-300">
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
      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 lg:px-4 py-6 flex flex-col overflow-hidden h-[calc(100vh-80px)]">

        {selectedItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[6fr_2fr_2fr] gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden motion-preset-fade motion-duration-300">

            {/* Column 1: Chart (60%) */}
            <div className="lg:col-span-1 min-h-[500px] flex flex-col gap-4">
              <CommandBar
                normTargets={normTargets}
                onUpdateNorm={setNormTargets}
                onResetView={handleResetView}
              />
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

            {/* Column 2: Stats Sidebar (20%) */}
            <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 bg-muted border border-border rounded-2xl shadow-sm flex-shrink-0">
                <h3 className="text-sm font-bold text-foreground">Items</h3>
                <div className="flex items-center gap-1">
                  <div className="group/clear flex items-center bg-background rounded-lg p-0.5 border border-border transition-all duration-300">
                    <span className="max-w-0 opacity-0 group-hover/clear:max-w-[80px] group-hover/clear:mx-1.5 group-hover/clear:opacity-100 transition-all duration-300 ease-out overflow-hidden whitespace-nowrap text-[10px] font-bold text-muted-foreground select-none">
                      Clear All
                    </span>
                    <button
                      onClick={handleClearAll}
                      className="p-1 rounded-md transition-all duration-300 flex items-center justify-center h-[22px] w-[22px] text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove all items"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="group/sort flex items-center bg-background rounded-lg p-0.5 border border-border transition-all duration-300">
                  <span className="max-w-0 opacity-0 group-hover/sort:max-w-[150px] group-hover/sort:mx-1.5 group-hover/sort:opacity-100 transition-all duration-300 ease-out overflow-hidden whitespace-nowrap text-[10px] font-bold text-muted-foreground select-none">
                    {!isSorted ? "sort-price-off" : sortDirection === 'asc' ? "sort-price-Increasing" : "sort-price-Decreasing"}
                  </span>
                  <button
                    onClick={() => setIsSorted(!isSorted)}
                    className={clsx(
                      "p-1 rounded-md transition-all duration-300 flex items-center justify-center h-[22px] w-[22px]",
                      isSorted 
                        ? "bg-accent text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={isSorted ? "Turn sort off" : "Sort by price"}
                  >
                    <ArrowDownWideNarrow size={12} />
                  </button>
                  <button
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className={clsx(
                      "rounded-md text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary hover:bg-white/50 dark:hover:bg-accent transition-all duration-300 ease-out flex items-center justify-center",
                      isSorted 
                        ? "w-[22px] h-[22px] opacity-100 scale-100 pointer-events-auto ml-1" 
                        : "w-0 h-[22px] opacity-0 scale-75 pointer-events-none overflow-hidden"
                    )}
                    title={sortDirection === 'asc' ? "Lowest first" : "Highest first"}
                  >
                    <ArrowUp 
                      size={12} 
                      className={clsx(
                        "transition-transform duration-300 ease-in-out",
                        sortDirection === 'desc' ? "rotate-180" : "rotate-0"
                      )} 
                    />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
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

            {/* Column 3: Details Panel (20%) */}
            <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 bg-muted border border-border rounded-2xl shadow-sm flex-shrink-0">
                <h3 className="text-sm font-bold text-foreground">Details</h3>
                {selectedDetailItemName && (
                  <button
                    onClick={() => setSelectedDetailItemName(null)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 size={12} />
                    Clear
                  </button>
                )}
              </div>
              <ItemDetailsPanel
                item={selectedItems.find(i => i.name === selectedDetailItemName)}
                stats={itemStats[selectedDetailItemName]}
                normTargets={normTargets.enabled ? normTargets : null}
                onClose={() => setSelectedDetailItemName(null)}
                onRemove={(item) => handleRemoveItem(item.name)}
              />
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