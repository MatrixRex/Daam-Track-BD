import { useState, useEffect, useMemo, useRef } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import { Search, X, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { DATA_BASE_URL } from '../config';
import ItemHoverCard from './ItemHoverCard';
import ItemDetailModal from './ItemDetailModal';

export default function SearchBar({ onSelect, selectedItems = [], normTargets, itemStats = {} }) {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [sideRect, setSideRect] = useState(null);
    const [detailItem, setDetailItem] = useState(null);

    // Detect touch device to disable hover
    const isTouchDevice = useMemo(() => {
        return (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    }, []);

    // Ref for clicking outside to close dropdown
    const searchRef = useRef(null);

    // 1. Fetch the Meta Index (Runs once on mount)
    useEffect(() => {
        fetch(`${DATA_BASE_URL}/data/meta.json`)
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

    // 2. Initialize uFuzzy & Memoize Haystack
    const uf = useMemo(() => new uFuzzy(), []);
    const haystack = useMemo(() => {
        return items.map(item => `${item.name} ${item.category}`);
    }, [items]);

    // 3. Handle Search Logic using uFuzzy
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        // Perform the search
        const [idxs, info, order] = uf.search(haystack, query);

        if (order && order.length > 0) {
            // Retrieve matched items using the sorted order double-indirection indices
            const finalResults = order.map(infoIdx => items[info.idx[infoIdx]]).slice(0, 8);
            setResults(finalResults);
            setIsOpen(true);
        } else {
            setResults([]);
        }
    }, [query, uf, haystack, items]);

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
                    <Search className="h-5 w-5 text-[#8B7E6B] dark:text-[#6B5B95] group-focus-within:text-[#7A9F7A] dark:group-focus-within:text-[#9D8EC9] transition-colors" />
                </div>

                <input
                    type="text"
                    className={clsx(
                        "block w-full pl-11 pr-12 py-4 bg-[#FFFDF8] dark:bg-[#2A2442] border border-[#D4E6DC] dark:border-[#4A3F6B] rounded-xl",
                        "text-[#5C5247] dark:text-[#B8AED0] placeholder-[#8B7E6B] dark:placeholder-[#6B5B95]",
                        "focus:outline-none focus:ring-2 focus:ring-[#97B897]/30 dark:focus:ring-[#6B5B95]/30 focus:border-[#97B897] dark:focus:border-[#6B5B95]",
                        "shadow-sm hover:shadow-md dark:shadow-[#1E1A2E]/50 transition-all duration-200",
                        "disabled:bg-[#F5E6D3] dark:disabled:bg-[#1E1A2E] disabled:cursor-not-allowed"
                    )}
                    placeholder={loading ? "Loading products..." : "Search for eggs, rice, beef..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (query) setIsOpen(true); }}
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
                        <X className="h-5 w-5 text-[#8B7E6B] dark:text-[#6B5B95] hover:text-[#5C5247] dark:hover:text-[#B8AED0] cursor-pointer" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute w-full mt-2 bg-[#FFFDF8] dark:bg-[#2A2442] rounded-xl shadow-xl dark:shadow-[#1E1A2E]/50 border border-[#D4E6DC] dark:border-[#4A3F6B] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="max-h-[60vh] overflow-y-auto">
                        {results.map((item, index) => {
                            const isSelected = selectedItems.some(i => i.name === item.name);
                            return (
                                <li
                                    key={index}
                                    onMouseEnter={() => {
                                        if (isTouchDevice) return;
                                        setHoveredItem(item);
                                        if (searchRef.current) {
                                            setSideRect(searchRef.current.getBoundingClientRect());
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (isTouchDevice) return;
                                        setHoveredItem(null);
                                        setSideRect(null);
                                    }}
                                    onMouseMove={(e) => {
                                        if (isTouchDevice) return;
                                        setMousePos({ x: e.clientX, y: e.clientY });
                                    }}
                                    onClick={() => {
                                        if (!isSelected) {
                                            onSelect(item);
                                            setQuery(''); // Clear input to allow adding more
                                            setIsOpen(false);
                                            setHoveredItem(null);
                                        }
                                    }}
                                    className={clsx(
                                        "flex items-center gap-4 p-3 border-b border-[#D4E6DC]/30 dark:border-[#3D3460] last:border-none transition-colors group relative",
                                        isSelected
                                            ? "bg-[#D4E6DC]/50 dark:bg-[#3D3460] cursor-default opacity-60"
                                            : "hover:bg-[#D4E6DC]/30 dark:hover:bg-[#3D3460]/50 cursor-pointer"
                                    )}
                                >
                                    {/* Product Image (With smart fallback) */}
                                    <div className="w-12 h-12 rounded-lg bg-[#F5E6D3] dark:bg-[#3D3460] p-1 flex-shrink-0 border border-[#D4E6DC] dark:border-[#4A3F6B] overflow-hidden">
                                        <img
                                            src={`${DATA_BASE_URL}/images/${item.image}`}
                                            alt={item.name}
                                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-90"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        {/* Fallback Icon if image fails */}
                                        <div className="hidden w-full h-full items-center justify-center bg-[#F5E6D3] dark:bg-[#3D3460] text-[#8B7E6B] dark:text-[#6B5B95] text-xs font-bold">
                                            {item.name.charAt(0)}
                                        </div>
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm sm:text-base font-semibold text-[#5C5247] dark:text-white truncate group-hover:text-[#7A9F7A] dark:group-hover:text-[#9D8EC9]">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F5E6D3] dark:bg-[#3D3460] text-[#8B7E6B] dark:text-[#B8AED0]">
                                                {item.category}
                                            </span>
                                            <span className="text-xs text-[#8B7E6B] dark:text-[#6B5B95]">•</span>
                                            <span className="text-xs text-[#8B7E6B] dark:text-[#B8AED0]">{item.unit}</span>
                                        </div>
                                    </div>

                                    {/* Price & Arrow/Check */}
                                    <div className="text-right flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm sm:text-base font-bold text-[#5C5247] dark:text-white">৳{item.price}</span>
                                            <span className="text-[10px] sm:text-xs text-[#8B7E6B] dark:text-[#6B5B95]">{isSelected ? 'Selected' : 'Latest'}</span>
                                        </div>
                                        {isSelected
                                            ? <Check className="w-4 h-4 text-[#7A9F7A] dark:text-[#9D8EC9]" />
                                            : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailItem(item);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-[#D4E6DC]/50 dark:hover:bg-[#3D3460] text-[#D4E6DC] dark:text-[#4A3F6B] hover:text-[#7A9F7A] dark:hover:text-[#9D8EC9] transition-all"
                                                    title="View Details"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            )
                                        }
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* "No Results" State */}
            {isOpen && query && results.length === 0 && (
                <div className="absolute w-full mt-2 bg-[#FFFDF8] dark:bg-[#2A2442] rounded-xl shadow-lg dark:shadow-[#1E1A2E]/50 border border-[#D4E6DC] dark:border-[#4A3F6B] p-8 text-center">
                    <p className="text-[#8B7E6B] dark:text-[#B8AED0]">No items found for "{query}"</p>
                </div>
            )}
            {/* Hover Details Card */}
            <ItemHoverCard
                item={hoveredItem}
                mousePos={mousePos}
                sideRect={sideRect}
                side="left"
                normTargets={normTargets}
                stats={hoveredItem ? itemStats[hoveredItem.name] : null}
            />

            {/* Mobile/Touch Details Modal */}
            <ItemDetailModal
                item={detailItem}
                onClose={() => setDetailItem(null)}
                normTargets={normTargets}
                stats={detailItem ? itemStats[detailItem.name] : null}
            />
        </div>
    );
}
