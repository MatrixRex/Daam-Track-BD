import { useState } from 'react';
import SearchBar from './components/SearchBar';
import PriceChart from './components/PriceChart';
import { useDuckDB } from './hooks/useDuckDB';
import { TrendingUp, BarChart3 } from 'lucide-react';

function App() {
  // 1. Start DuckDB in background
  useDuckDB();

  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        {/* Changed max-w-3xl to max-w-7xl for wider layout */}
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

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
            {/* Pass a prop to make search bar smaller if needed, or just use as is */}
            <SearchBar onSelect={setSelectedItem} />
          </div>

        </div>
      </div>

      {/* --- MOBILE SEARCH (Visible only on small screens) --- */}
      <div className="md:hidden p-4 bg-white border-b border-slate-200">
        <SearchBar onSelect={setSelectedItem} />
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      {/* Changed max-w-3xl to max-w-7xl to use full screen */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {selectedItem ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Product Info */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                <div className="w-full aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                  <img
                    src={`/images/${selectedItem.image}`}
                    alt={selectedItem.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedItem.name}</h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {selectedItem.category}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                    {selectedItem.unit}
                  </span>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  ৳{selectedItem.price}
                </div>
                <div className="text-sm text-slate-500">Current Market Price</div>
              </div>
            </div>

            {/* Right Column: Chart (Takes up 2/3 space) */}
            <div className="lg:col-span-2">
              <PriceChart item={selectedItem} />
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
              Try searching for "Rice", "Egg", or "Beef" to see how prices have changed over time.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;