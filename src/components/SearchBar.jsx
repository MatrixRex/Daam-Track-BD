import { useState, useEffect, useMemo, useRef } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import { Search, X, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { DATA_BASE_URL } from '../config';
import ItemHoverCard from './ItemHoverCard';
import ItemDetailModal from './ItemDetailModal';

export default function SearchBar({ 
    onSelect, 
    items = [], 
    loading = false, 
    selectedItems = [], 
    normTargets, 
    itemStats = {} 
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
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
    
    // States and refs for dynamic dropdown height transition
    const [dropdownHeight, setDropdownHeight] = useState(0);
    const innerRef = useRef(null);

    // Initialize uFuzzy & Memoize Haystack
    const uf = useMemo(() => new uFuzzy(), []);
    const haystack = useMemo(() => {
        return items.map(item => `${item.name} ${item.category}`);
    }, [items]);

    // 3. Handle Search Logic using uFuzzy
    const results = useMemo(() => {
        if (!query.trim()) {
            return [];
        }

        // Perform the search
        const [, info, order] = uf.search(haystack, query);

        if (order && order.length > 0) {
            // Retrieve matched items using the sorted order double-indirection indices
            return order.map(infoIdx => items[info.idx[infoIdx]]).slice(0, 24);
        }
        return [];
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

    // 5. Observe dropdown content height changes to animate container size
    useEffect(() => {
        if (!isOpen || results.length === 0) {
            setDropdownHeight(0);
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Buffer to account for border widths if any
                setDropdownHeight(entry.contentRect.height);
            }
        });

        if (innerRef.current) {
            resizeObserver.observe(innerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [isOpen, results]);

    return (
        <div ref={searchRef} className="relative w-full max-w-2xl mx-auto z-50">

            {/* Search Input Area */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-text-500 group-focus-within:text-primary-500 transition-colors" />
                </div>

                <input
                    type="text"
                    className={clsx(
                        "block w-full pl-11 pr-12 py-4 bg-background-100 border border-primary-200 rounded-xl",
                        "text-text-800 placeholder-text-500",
                        "focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400",
                        "shadow-sm hover:shadow-md transition-all duration-200",
                        "disabled:bg-background-50 disabled:cursor-not-allowed"
                    )}
                    placeholder={loading ? "Loading products..." : "Search for eggs, rice, beef..."}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.trim()) {
                            setIsOpen(true);
                        }
                    }}
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
                        <X className="h-5 w-5 text-text-500 hover:text-text-800 cursor-pointer" />
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute w-full md:w-[150%] lg:w-[180%] md:left-1/2 md:-translate-x-1/2 mt-2 z-50">
                    <div 
                        className="bg-background-100 rounded-2xl shadow-2xl border border-primary-200 overflow-hidden motion-preset-blur-down motion-duration-300 transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ height: dropdownHeight ? `${dropdownHeight}px` : '0px' }}
                    >
                        <div ref={innerRef}>
                            <ul className="max-h-[60vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3">
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
                                            "flex items-center gap-3 p-2.5 rounded-xl border border-primary-200/40 transition-all duration-200 group relative",
                                            isSelected
                                                ? "bg-primary-200/40 cursor-default opacity-70"
                                                : "hover:bg-primary-200/20 hover:border-primary-500/30 hover:shadow-sm cursor-pointer"
                                        )}
                                    >
                                        {/* Product Image (With smart fallback) */}
                                        <div className="w-10 h-10 rounded-lg bg-background-50 p-1 flex-shrink-0 border border-primary-200 overflow-hidden">
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
                                            <div className="hidden w-full h-full items-center justify-center bg-background-50 text-text-500 text-xs font-bold">
                                                {item.name.charAt(0)}
                                            </div>
                                        </div>

                                        {/* Text Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs sm:text-sm font-semibold text-text-800 truncate group-hover:text-primary-500">
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background-50 text-text-500">
                                                    {item.category}
                                                </span>
                                                <span className="text-[10px] text-text-500">•</span>
                                                <span className="text-[10px] text-text-500">{item.unit}</span>
                                            </div>
                                        </div>

                                        {/* Price & Arrow/Check */}
                                        <div className="text-right flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs sm:text-sm font-bold text-text-800">৳{item.price}</span>
                                                <span className="text-[9px] sm:text-[10px] text-text-500">{isSelected ? 'Selected' : 'Latest'}</span>
                                            </div>
                                            {isSelected
                                                ? <Check className="w-3.5 h-3.5 text-primary-500" />
                                                : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDetailItem(item);
                                                        }}
                                                        className="p-1 rounded-md hover:bg-primary-200/50 text-text-500 hover:text-primary-500 transition-all"
                                                        title="View Details"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                )
                                            }
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
            )}

            {/* "No Results" State */}
            {isOpen && query && results.length === 0 && (
                <div className="absolute w-full mt-2 bg-background-100 rounded-xl shadow-lg border border-primary-200 p-8 text-center">
                    <p className="text-text-500">No items found for "{query}"</p>
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
