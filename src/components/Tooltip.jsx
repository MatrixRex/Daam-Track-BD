import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const Tooltip = ({ content, children, delay = 400, align = "center" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        }
    };

    const handleMouseEnter = () => {
        updateCoords();
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

    // Update position on window scroll or resize to prevent alignment drift
    useEffect(() => {
        if (isVisible) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isVisible]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={triggerRef}
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none motion-preset-fade motion-duration-200"
                    style={{
                        top: `${coords.top - 8}px`,
                        left: align === "center"
                            ? `${coords.left + coords.width / 2}px`
                            : `${coords.left + coords.width}px`,
                        transform: align === "center"
                            ? 'translate(-50%, -100%)'
                            : 'translate(-100%, -100%)',
                    }}
                >
                    <div className="relative px-2.5 py-1 bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg whitespace-nowrap">
                        {content}
                        <div className={clsx(
                            "absolute top-full border-4 border-transparent border-t-slate-800",
                            align === "center" && "left-1/2 -translate-x-1/2",
                            align === "right" && "right-2.5 translate-x-0"
                        )}></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
