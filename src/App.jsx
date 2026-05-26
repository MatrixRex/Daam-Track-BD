import { useState, useRef, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChartECharts';
import DevControls from './components/DevControls';
import EmptyStateSkeleton from './components/EmptyStateSkeleton';
import ThemeToggle from './components/ThemeToggle';
import BuildInfo from './components/BuildInfo';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, X, Trash2, ArrowDownWideNarrow, ArrowUp, ArrowDown, Download, FileJson, FileSpreadsheet, Image as ImageIcon, FileText, Copy, Menu, Search } from 'lucide-react';
import { useMemo } from 'react';
import { DATA_BASE_URL } from './config';
import { Toaster, toast } from 'sonner';
import CommandBar from './components/CommandBar';
import StatsSidebar from './components/StatsSidebar';
import ItemDetailsPanel from './components/ItemDetailsPanel';
import SelectedDatePanel from './components/SelectedDatePanel';
import Tooltip from './components/Tooltip';
import { ChevronRight, Scale } from 'lucide-react';
import clsx from 'clsx';
import { getNormalizedPrice } from './utils/quantityUtils';

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
  const [selectedDetailItemName, setSelectedDetailItemName] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateData, setSelectedDateData] = useState(null);
  const [normTargets, setNormTargets] = useState({
    mass: 1,
    volume: 1,
    count: 1,
    enabled: false
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [deletingItems, setDeletingItems] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);



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

  // Remove item from comparison
  const handleRemoveItem = useCallback((itemName) => {
    // Clear detail panel and hover state immediately for a snappier feel
    if (selectedDetailItemName === itemName) {
      setSelectedDetailItemName(null);
    }

    setDeletingItems(prev => [...prev, itemName]);

    setTimeout(() => {
      setSelectedItems(prev => prev.filter(i => i.name !== itemName));
      setDeletingItems(prev => prev.filter(name => name !== itemName));
    }, 200); // 200ms duration for exit animation (snappier!)
  }, [selectedDetailItemName]);

  // Clear all items with a staggered cascade delete effect from bottom to top
  const handleClearAll = useCallback(() => {
    if (sortedItems.length === 0) return;

    // Clear detail panel immediately
    setSelectedDetailItemName(null);
    setSelectedDate(null);
    setSelectedDateData(null);

    const itemsToClear = [...sortedItems]; // Use sortedItems to respect visual bottom-to-top layout!
    const delayStep = 35; // Speed up delay to 35ms for an extremely snappy feel
    const exitDuration = 200; // Speed up single animation to 200ms

    // Stagger adding items to the deleting list (bottom-to-top cascade)
    itemsToClear.forEach((item, index) => {
      const delay = (itemsToClear.length - 1 - index) * delayStep;
      setTimeout(() => {
        setDeletingItems(prev => {
          if (prev.includes(item.name)) return prev;
          return [...prev, item.name];
        });
      }, delay);
    });

    // Wait until the last item (top-most) completes its exit animation
    const totalDuration = (itemsToClear.length - 1) * delayStep + exitDuration;

    setTimeout(() => {
      setSelectedItems([]);
      setDeletingItems([]);
      // Reset color assignments when all items are cleared
      colorAssignmentsRef.current.clear();
      nextColorIndexRef.current = 0;
    }, totalDuration);
  }, [sortedItems]);

  const handleResetUnits = useCallback(() => {
    setNormTargets(prev => ({
      ...prev,
      mass: 1,
      volume: 1,
      count: 1
    }));
    toast.info("Normalized units reset to default (1)");
  }, []);


  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">

      {/* --- HEADER SECTION --- */}
      <div className="bg-muted border-b border-border shadow-sm sticky top-0 z-50 transition-colors duration-300 motion-preset-fade motion-duration-300">
        <div className="relative mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between md:grid md:grid-cols-3 gap-4">

          {/* Logo */}
          <div className="flex items-center justify-start transition-all duration-500 ease-out flex-shrink-0 gap-4 w-auto">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg text-white flex-shrink-0">
                <TrendingUp size={24} />
              </div>
              <h1 className={clsx(
                "font-bold tracking-tight text-foreground transition-all duration-500 overflow-hidden whitespace-nowrap",
                isSearchExpanded 
                  ? "w-0 opacity-0 md:w-auto md:opacity-100 text-xl sm:text-2xl" 
                  : "max-w-[200px] opacity-100 text-xl sm:text-2xl"
              )}>
                Daam<span className="text-primary">Trace</span>
              </h1>
            </div>

            {/* Advanced Dev Controls (Quick Add + Data Source) */}
            <div className="hidden md:block">
              <DevControls 
                allItems={allItems} 
                selectedItems={selectedItems} 
                onAddItems={handleBulkAdd} 
              />
            </div>
          </div>

          {/* Center/Right: Search Bar */}
          <div className="flex-1 flex justify-end z-40 transition-all duration-500 ease-out md:justify-center">
            <SearchBar
              onSelect={handleAddItem}
              items={allItems}
              loading={isMetaLoading}
              selectedItems={selectedItems}
              normTargets={normTargets.enabled ? normTargets : null}
              itemStats={itemStats}
              autoFocus={isSearchExpanded}
              emptyState={selectedItems.length === 0}
              isMobileExpanded={isSearchExpanded}
              onMobileExpandChange={setIsSearchExpanded}
              onSuggestionsListOpenChange={setIsSearchSuggestionsOpen}
            />
          </div>

          {/* Right: Actions / Mobile Search Toggle */}
          <div className="flex items-center justify-end gap-3 flex-shrink-0 w-auto flex">

            {/* Desktop-only Actions */}
            <div className="hidden md:flex items-center justify-end gap-3">
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

            {/* Hamburger Menu Button (visible only on mobile) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-muted border border-border text-foreground hover:bg-accent transition-all flex items-center justify-center active:scale-95 flex-shrink-0 w-10 h-10 opacity-100 scale-100"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* --- MOBILE HAMBURGER MENU DROPDOWN --- */}
        {isMobileMenuOpen && (
          <div className="absolute top-20 left-0 right-0 z-40 md:hidden border-b border-border bg-muted/95 backdrop-blur-md px-4 py-4 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</span>
              <ThemeToggle />
            </div>

            {/* DevControls mobile integration */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dev Tools & Controls</span>
              <div className="bg-background border border-border rounded-xl p-2">
                <DevControls 
                  allItems={allItems} 
                  selectedItems={selectedItems} 
                  onAddItems={handleBulkAdd} 
                />
              </div>
            </div>

            {/* Export Options inside hamburger */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export Comparison</span>
              {selectedItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add items to enable export options.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { chartRef.current?.exportImage('download'); setIsMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-background border border-border hover:bg-accent text-xs font-semibold text-foreground"
                  >
                    <ImageIcon size={14} className="text-blue-500" />
                    <span>Image (PNG)</span>
                  </button>
                  <button
                    onClick={() => { chartRef.current?.exportData('xlsx', 'download'); setIsMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-background border border-border hover:bg-accent text-xs font-semibold text-foreground"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500" />
                    <span>Excel (XLSX)</span>
                  </button>
                  <button
                    onClick={() => { chartRef.current?.exportData('csv', 'download'); setIsMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-background border border-border hover:bg-accent text-xs font-semibold text-foreground"
                  >
                    <FileText size={14} className="text-amber-500" />
                    <span>CSV File</span>
                  </button>
                  <button
                    onClick={() => { chartRef.current?.exportData('json', 'download'); setIsMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-background border border-border hover:bg-accent text-xs font-semibold text-foreground"
                  >
                    <FileJson size={14} className="text-purple-500" />
                    <span>JSON Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop Dim Overlay for Mobile Hamburger Menu or Search Suggestions */}
      {(isMobileMenuOpen || isSearchSuggestionsOpen) && (
        <div 
          onClick={() => {
            setIsMobileMenuOpen(false);
          }}
          className="fixed inset-0 top-20 bg-black/50 backdrop-blur-[2px] z-20 animate-in fade-in duration-300 cursor-pointer"
        />
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 lg:px-4 py-6 flex flex-col overflow-hidden h-[calc(100vh-80px)]">

        {selectedItems.length > 0 ? (
          <div className="flex flex-col lg:grid lg:grid-cols-[6fr_2fr_2fr] gap-4 flex-1 min-h-0 overflow-hidden motion-preset-fade motion-duration-300">

            {/* Column 1: Chart (60%) */}
            <div className="flex flex-col gap-4 flex-none min-h-[300px] sm:min-h-[330px] lg:h-auto lg:flex-1 lg:col-span-1 min-h-0">
              <CommandBar
                normTargets={normTargets}
                onUpdateNorm={setNormTargets}
                onResetUnits={handleResetUnits}
              />
              <PriceChart
                ref={chartRef}
                items={selectedItems}
                colors={COLORS}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                onStatsUpdate={handleStatsUpdate}
                normTargets={normTargets.enabled ? normTargets : null}
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(prev => prev === date ? null : date);
                  setSelectedDetailItemName(null);
                }}
                onSelectedDateDataChange={setSelectedDateData}
              />
            </div>

            {/* Column 2: Stats Sidebar (20%) */}
            <div className="flex flex-col gap-4 flex-1 min-h-0 lg:col-span-1 overflow-hidden z-10">
              <div className="flex items-center justify-between px-4 h-16 bg-muted border border-border rounded-2xl shadow-sm flex-shrink-0">
                <h3 className="text-sm font-bold text-foreground">
                  {selectedDateData 
                    ? `Prices (${selectedDateData.dateShort})` 
                    : `ITEMS TRACKED (${selectedItems.length})`}
                </h3>
                <div className="flex items-center gap-1.5">
                  {selectedDateData && (
                    <Tooltip content="Clear Selected Date">
                      <button
                        onClick={() => {
                          setSelectedDate(null);
                          setSelectedDateData(null);
                        }}
                        className="p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[26px] w-[26px] bg-purple-500/10 border border-purple-500/30 text-purple-600 hover:text-purple-700 hover:bg-purple-500/20 active:scale-95 animate-pulse"
                      >
                        <X size={13} />
                      </button>
                    </Tooltip>
                  )}

                  <Tooltip content="Clear All">
                    <button
                      onClick={handleClearAll}
                      className="p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[26px] w-[26px] bg-background border border-border text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>

                  <div className="flex items-center bg-background rounded-lg p-0.5 border border-border">
                    <Tooltip content={isSorted ? "Turn sort off" : "Sort by price"} align="right">
                      <button
                        onClick={() => setIsSorted(!isSorted)}
                        className={clsx(
                          "p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[22px] w-[22px] active:scale-95",
                          isSorted 
                            ? "bg-accent text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ArrowDownWideNarrow size={12} />
                      </button>
                    </Tooltip>
                    
                    <Tooltip content={sortDirection === 'asc' ? "Lowest first" : "Highest first"} align="right">
                      <button
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className={clsx(
                          "rounded-lg text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary hover:bg-white/50 dark:hover:bg-accent transition-all duration-300 ease-out flex items-center justify-center active:scale-95",
                          isSorted 
                            ? "w-[22px] h-[22px] opacity-100 scale-100 pointer-events-auto ml-0.5" 
                            : "w-0 h-[22px] opacity-0 scale-75 pointer-events-none overflow-hidden"
                        )}
                      >
                        <ArrowUp 
                          size={12} 
                          className={clsx(
                            "transition-transform duration-300 ease-in-out",
                            sortDirection === 'desc' ? "rotate-180" : "rotate-0"
                          )} 
                        />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              
              <div 
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pt-1.5"
              >
                <StatsSidebar
                  items={sortedItems}
                  stats={Object.values(itemStats)}
                  colors={COLORS}
                  normTargets={normTargets.enabled ? normTargets : null}
                  onRemove={(item) => handleRemoveItem(item.name)}
                  onHover={setHoveredItem}
                  selectedItemName={selectedDetailItemName}
                  onSelect={(name) => {
                    setSelectedDetailItemName(prev => prev === name ? null : name);
                  }}
                  selectedDateData={selectedDateData}
                  deletingItems={deletingItems}
                />
              </div>
            </div>

            {/* Column 3: Details Panel (20%) - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex lg:flex-col gap-4 min-h-0 overflow-visible">
              <div className="flex items-center justify-between px-4 h-16 bg-muted border border-border rounded-2xl shadow-sm flex-shrink-0">
                <h3 className="text-sm font-bold text-foreground">
                  Details
                </h3>
                {selectedDetailItemName && (
                  <Tooltip content="Clear" align="right">
                    <button
                      onClick={() => {
                        setSelectedDetailItemName(null);
                      }}
                      className="p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[26px] w-[26px] bg-background border border-border text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                )}
              </div>
              <ItemDetailsPanel
                item={selectedItems.find(i => i.name === selectedDetailItemName)}
                stats={itemStats[selectedDetailItemName]}
                normTargets={normTargets.enabled ? normTargets : null}
              />
            </div>

          </div>
        ) : (
          /* Empty State */
          <EmptyStateSkeleton />
        )}

      </div>
      <BuildInfo />
      <Toaster position="bottom-right" theme="system" />

      {/* --- MOBILE BOTTOM DETAILS DRAWER --- */}
      {selectedDetailItemName && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-[1.5px] z-40 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailItemName(null)}
        />
      )}
      <div 
        className={clsx(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] flex flex-col transition-transform duration-300 ease-out transform",
          selectedDetailItemName ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: '80vh' }}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-2 border-b border-border/20 flex-shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Details</span>
          <button 
            onClick={() => setSelectedDetailItemName(null)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable details panel body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {selectedDetailItemName && (
            <ItemDetailsPanel
              item={selectedItems.find(i => i.name === selectedDetailItemName)}
              stats={itemStats[selectedDetailItemName]}
              normTargets={normTargets.enabled ? normTargets : null}
            />
          )}
        </div>
      </div>

    </div>
  );
}

export default App;