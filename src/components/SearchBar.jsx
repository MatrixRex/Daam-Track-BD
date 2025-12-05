import { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function SearchBar({ onSelect }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Ref for clicking outside to close dropdown
  const searchRef = useRef(null);

  // 1. Fetch the Meta Index (Runs once on mount)
  useEffect(() => {
    fetch('/data/meta.json')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load search index:", err);
        setLoading(false);
      });
  }, []);

  // 2. Initialize Fuse.js (The Fuzzy Search Engine)
  const fuse = useMemo(() => new Fuse(items, {
    keys: ['name', 'category'], // Search in these fields
    threshold: 0.3,             // 0.0 = Exact match, 1.0 = Match anything
    distance: 100,              // How close the typo can be
    minMatchCharLength: 2
  }), [items]);

  // 3. Handle Search Logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // Perform the search
    const searchResults = fuse.search(query);
    
    // Transform Fuse results back to item objects & limit to 8
    const topResults = searchResults.slice(0, 8).map(r => r.item);
    setResults(topResults);
    setIsOpen(true);
  }, [query, fuse]);

  // 4. Handle Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto z-50">
      
      {/* Search Input Area */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        
        <input
          type="text"
          className={clsx(
            "block w-full pl-11 pr-12 py-4 bg-white border border-gray-200 rounded-xl",
            "text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            "shadow-sm hover:shadow-md transition-all duration-200",
            "disabled:bg-gray-50 disabled:cursor-not-allowed"
          )}
          placeholder={loading ? "Loading products..." : "Search for eggs, rice, beef..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if(query) setIsOpen(true); }}
          disabled={loading}
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              onSelect(null); // Clear selection
            }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-[60vh] overflow-y-auto">
            {results.map((item, index) => (
              <li 
                key={index}
                onClick={() => {
                  onSelect(item);
                  setQuery(item.name); // Fill input with selected name
                  setIsOpen(false);
                }}
                className="flex items-center gap-4 p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none transition-colors group"
              >
                {/* Product Image (With smart fallback) */}
                <div className="w-12 h-12 rounded-lg bg-gray-100 p-1 flex-shrink-0 border border-gray-200 overflow-hidden">
                  <img 
                    src={`/images/${item.image}`} 
                    alt={item.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback Icon if image fails */}
                  <div className="hidden w-full h-full items-center justify-center bg-gray-100 text-gray-400 text-xs font-bold">
                    {item.name.charAt(0)}
                  </div>
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{item.unit}</span>
                  </div>
                </div>

                {/* Price & Arrow */}
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">৳{item.price}</span>
                    <span className="text-[10px] text-gray-400">Latest</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* "No Results" State */}
      {isOpen && query && results.length === 0 && (
        <div className="absolute w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
          <p className="text-gray-500">No items found for "{query}"</p>
        </div>
      )}
    </div>
  );
}