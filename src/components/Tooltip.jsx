import React, { useState, useRef, useEffect } from 'react';

const Tooltip = ({ content, children, delay = 400 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Cleanup timeout on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg whitespace-nowrap z-50 pointer-events-none motion-preset-fade motion-duration-200">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
