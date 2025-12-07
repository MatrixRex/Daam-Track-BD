import { useState } from 'react';
import { Database, FolderOpen } from 'lucide-react';

/**
 * A handy toggle button to switch between Local (fake) and Remote (real) data.
 * Visible ONLY in development mode.
 */
function DevSourceToggle() {
    // Only render in development
    if (!import.meta.env.DEV) return null;

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

    return (
        <button
            onClick={toggleSource}
            className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border transition-all
        ${useRemote
                    ? 'bg-purple-100 dark:bg-[#3D3460] text-purple-700 dark:text-[#9D8EC9] border-purple-200 dark:border-[#4A3F6B] hover:bg-purple-200 dark:hover:bg-[#4A3F6B]'
                    : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/60'
                }
      `}
            title={`Click to switch to ${useRemote ? 'Local' : 'Remote'} Data`}
        >
            {useRemote ? <Database size={14} /> : <FolderOpen size={14} />}
            <span>{useRemote ? 'Remote Data' : 'Local Data'}</span>
        </button>
    );
}

export default DevSourceToggle;
