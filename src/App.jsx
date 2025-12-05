import { useState } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChart';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, X, Trash2 } from 'lucide-react';

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

  // Add item to comparison (no limit)
  const handleAddItem = (item) => {
    if (!item) return;
    // Check if already selected
    if (selectedItems.some(i => i.name === item.name)) return;
    setSelectedItems([...selectedItems, item]);
  };

  // Remove item from comparison
  const handleRemoveItem = (itemName) => {
    setSelectedItems(selectedItems.filter(i => i.name !== itemName));
  };

  // Clear all items
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              DaamTrack<span className="text-blue-600">BD</span>
            </h1>
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
              <PriceChart items={selectedItems} colors={COLORS} />
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
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} />
                      Clear all
                    </button>
                  )}
                </div>

                {/* Items List */}
                <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
                  {selectedItems.map((item, index) => (
                    <li
                      key={item.name}
                      className="p-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Color Indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length].stroke,
                            ringColor: COLORS[index % COLORS.length].stroke + '40'
                          }}
                        />

                        {/* Small Image */}
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                          <img
                            src={`/images/${item.image}`}
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{item.category}</span>
                            <span className="text-xs font-semibold text-slate-700">৳{item.price}</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.name)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
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