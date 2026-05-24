import { useState } from 'react';
import { Database, FolderOpen, Zap, Plus } from 'lucide-react';

/**
 * Advanced Development Controls
 * Visible ONLY in development mode.
 * Features:
 * 1. Switch between Local/Remote data sources
 * 2. Quick Add random items for testing chart/UI limits
 */
function DevControls({ allItems = [], selectedItems = [], onAddItems }) {
    // Only render in development
    if (!import.meta.env.DEV) return null;

    const [addCount, setAddCount] = useState(5);
    const [useRemote, setUseRemote] = useState(() => {
        return localStorage.getItem('useRemoteData') === 'true';
    });

    const toggleSource = () => {
        const newValue = !useRemote;
        setUseRemote(newValue);
        localStorage.setItem('useRemoteData', String(newValue));
        // Reload to re-initialize DuckDB with new URL
        window.location.reload();
    };

    const handleQuickAdd = () => {
        if (!allItems.length || !onAddItems) return;

        // 1. Filter out items already selected
        const selectedNames = new Set(selectedItems.map(i => i.name));
        const available = allItems.filter(item => !selectedNames.has(item.name));

        if (!available.length) return;

        // 2. Shuffle and pick
        const count = Math.min(addCount, available.length);
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        const toAdd = shuffled.slice(0, count);

        onAddItems(toAdd);
    };

    return (
        <div className="flex items-center gap-2 bg-muted p-1 pr-2 rounded-full border border-border shadow-sm motion-preset-fade motion-duration-200">
            
            {/* 1. Quick Add Section */}
            <div className="flex items-center gap-1.5 pl-2 border-r border-border pr-2">
                <div className="relative group/input">
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={addCount}
                        onChange={(e) => setAddCount(parseInt(e.target.value) || 1)}
                        className="w-10 h-7 text-center bg-transparent text-xs font-bold text-foreground focus:outline-none"
                        title="Number of items to add"
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/input:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        Items to add
                    </div>
                </div>

                <button
                    onClick={handleQuickAdd}
                    className="flex items-center gap-1 px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded-full text-[10px] font-bold transition-all shadow-sm active:scale-95 group relative"
                    title="Add Random Items"
                >
                    <Zap size={10} fill="currentColor" />
                    <span>Quick Add</span>
                    
                    {/* Tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        Add {addCount} random products
                    </div>
                </button>
            </div>

            {/* 2. Data Source Toggle */}
            <button
                onClick={toggleSource}
                className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all
                    ${useRemote
                        ? 'text-primary hover:bg-primary/10'
                        : 'text-secondary hover:bg-secondary/10'
                    }
                `}
                title={`Switch to ${useRemote ? 'Local' : 'Remote'} Data`}
            >
                {useRemote ? <Database size={12} /> : <FolderOpen size={12} />}
                <span>{useRemote ? 'Remote' : 'Local'}</span>
            </button>
        </div>
    );
}

export default DevControls;
