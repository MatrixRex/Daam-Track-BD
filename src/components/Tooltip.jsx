import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

const Tooltip = ({ content, children, delay = 400, align = "center" }) => {
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
                <div className={clsx(
                    "absolute bottom-full mb-2 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg whitespace-nowrap z-50 pointer-events-none motion-preset-fade motion-duration-200",
                    align === "center" && "left-1/2 -translate-x-1/2",
                    align === "right" && "right-0 translate-x-0"
                )}>
                    {content}
                    <div className={clsx(
                        "absolute top-full border-4 border-transparent border-t-slate-800",
                        align === "center" && "left-1/2 -translate-x-1/2",
                        align === "right" && "right-2.5 translate-x-0"
                    )}></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
