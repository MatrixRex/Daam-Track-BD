import { useState, useRef, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChartECharts';
import DevSourceToggle from './components/DevSourceToggle';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, X, Trash2, ArrowDownWideNarrow, ArrowUp, ArrowDown } from 'lucide-react';
import { useMemo } from 'react';
import { DATA_BASE_URL } from './config';

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
  }, []);

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
      const priceA = itemStats[a.name]?.current ?? a.price ?? 0;
      const priceB = itemStats[b.name]?.current ?? b.price ?? 0;

      return sortDirection === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }, [selectedItems, isSorted, sortDirection, itemStats]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <TrendingUp size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                DaamTrack<span className="text-blue-600">BD</span>
              </h1>
            </div>

            {/* Dev Data Source Toggle */}
            <DevSourceToggle />
          </div>

          {/* Search Bar in Header (Right Side) */}
          <div className="hidden md:block w-96">
            <SearchBar
              onSelect={handleAddItem}
              selectedItems={selectedItems}
            />
          </div>

        </div>
      </div>

      {/* --- MOBILE SEARCH (Visible only on small screens) --- */}
      <div className="md:hidden p-4 bg-white border-b border-slate-200">
        <SearchBar
          onSelect={handleAddItem}
          selectedItems={selectedItems}
        />
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {selectedItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Left Column: Chart (3/4 width) */}
            <div className="lg:col-span-3">
              <PriceChart
                items={selectedItems}
                colors={COLORS}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                onStatsUpdate={handleStatsUpdate}
              />
            </div>

            {/* Right Column: Selected Items List (1/4 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Comparing</h3>
                    <p className="text-xs text-slate-400">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  {selectedItems.length > 1 && (
                    <div className="flex items-center gap-2">
                      {/* Sort Controls */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          onClick={() => setIsSorted(!isSorted)}
                          className={`p-1.5 rounded-md transition-all ${isSorted ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          title={isSorted ? "Turn sort off" : "Sort by price"}
                        >
                          <ArrowDownWideNarrow size={14} />
                        </button>

                        {isSorted && (
                          <button
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/50 transition-all"
                            title={sortDirection === 'asc' ? "Lowest first" : "Highest first"}
                          >
                            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          </button>
                        )}
                      </div>

                      <div className="w-px h-4 bg-slate-200 mx-1"></div>

                      <button
                        onClick={handleClearAll}
                        className="text-xs px-2 py-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Clear all items"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300 pr-1">
                  {sortedItems.map((item) => {
                    const itemColor = getItemColor(item.name);
                    return (
                      <li
                        key={item.name}
                        onMouseEnter={() => setHoveredItem(item.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`p-3 transition-colors group cursor-pointer ${hoveredItem === item.name ? 'bg-blue-50/80 shadow-sm border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Color Indicator */}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                            style={{
                              backgroundColor: itemColor.stroke,
                              ringColor: itemColor.stroke + '40'
                            }}
                          />

                          {/* Small Image */}
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            <img
                              src={`${DATA_BASE_URL}/images/${item.image}`}
                              alt={item.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 truncate">
                              {item.name}
                            </h4>
                            <div className="flex flex-col gap-0.5">
                              {/* Current Price and Change */}
                              {itemStats[item.name] ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">৳{itemStats[item.name].current}</span>
                                    <span className={`text-xs font-medium flex items-center ${itemStats[item.name].change > 0 ? 'text-red-500' : itemStats[item.name].change < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                                      {itemStats[item.name].change > 0 ? '▲' : itemStats[item.name].change < 0 ? '▼' : ''}
                                      {Math.abs(itemStats[item.name].change)}
                                    </span>
                                  </div>
                                  {/* High / Low Stats */}
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                    <span className="text-green-600 bg-green-50 px-1 py-0.5 rounded">L: {itemStats[item.name].min}</span>
                                    <span className="text-red-600 bg-red-50 px-1 py-0.5 rounded">H: {itemStats[item.name].max}</span>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-slate-700">৳{item.price}</span>
                              )}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.name);
                            }}
                            className="text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Remove item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer hint */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                  <p className="text-xs text-slate-400 text-center">
                    Search to add more items
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
              <TrendingUp className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Start by searching for an item</h2>
            <p className="text-slate-500 max-w-md">
              Search and select multiple items to compare their price trends side by side.
              <br />
              <span className="text-slate-400 text-sm">Try "Rice", "Egg", or "Beef"</span>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;