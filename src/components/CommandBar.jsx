import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Scale, Droplet, Hash } from 'lucide-react';
import clsx from 'clsx';
import Tooltip from './Tooltip';

function DraggableNumericInput({ id, value, onChange, unit }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const startXRef = useRef(0);
    const startValueRef = useRef(0);
    const hasMovedRef = useRef(false);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleMouseDown = (e) => {
        startXRef.current = e.clientX;
        startValueRef.current = value;
        hasMovedRef.current = false;
        isDraggingRef.current = true;
        setIsDragging(true);

        const handleMouseMove = (moveEvent) => {
            if (!isDraggingRef.current) return;
            const deltaX = moveEvent.clientX - startXRef.current;
            if (Math.abs(deltaX) > 5) {
                hasMovedRef.current = true;
            }

            if (hasMovedRef.current) {
                let newValue;
                if (id === 'count') {
                    const change = Math.round(deltaX / 8);
                    newValue = Math.max(1, startValueRef.current + change);
                } else {
                    const change = parseFloat((deltaX / 80).toFixed(1));
                    newValue = parseFloat(Math.max(0.1, startValueRef.current + change).toFixed(1));
                }
                onChange(newValue);
            }
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            if (!hasMovedRef.current) {
                setIsEditing(true);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        startXRef.current = touch.clientX;
        startValueRef.current = value;
        hasMovedRef.current = false;
        isDraggingRef.current = true;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startXRef.current;
        
        if (Math.abs(deltaX) > 5) {
            hasMovedRef.current = true;
        }

        if (hasMovedRef.current) {
            if (e.cancelable) e.preventDefault();
            let newValue;
            if (id === 'count') {
                const change = Math.round(deltaX / 8);
                newValue = Math.max(1, startValueRef.current + change);
            } else {
                const change = parseFloat((deltaX / 80).toFixed(1));
                newValue = parseFloat(Math.max(0.1, startValueRef.current + change).toFixed(1));
            }
            onChange(newValue);
        }
    };

    const handleTouchEnd = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        if (!hasMovedRef.current) {
            setIsEditing(true);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center bg-background border border-ring rounded-lg px-1.5 py-0.5 md:px-2 md:py-1 shadow-[0_0_8px_rgba(253,143,0,0.2)] animate-in zoom-in-95 duration-100">
                <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    onBlur={() => setIsEditing(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setIsEditing(false);
                        }
                    }}
                    className="w-10 md:w-12 bg-transparent text-sm font-bold text-foreground outline-none text-center"
                    step="any"
                    min="0"
                />
                <span className="text-[10px] font-bold text-muted-foreground ml-1">{unit}</span>
            </div>
        );
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
            className={clsx(
                "flex items-center bg-background border rounded-lg px-1.5 py-0.5 md:px-2 md:py-1 cursor-ew-resize select-none transition-all duration-150",
                isDragging 
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_8px_rgba(253,143,0,0.2)] scale-[1.04]" 
                    : "border-border hover:border-ring hover:bg-accent/40 active:scale-[0.98]"
            )}
            title="Drag horizontally to adjust, tap to type"
        >
            <span className="w-10 md:w-12 text-sm font-bold text-foreground text-center">
                {value}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                {unit}
            </span>
        </div>
    );
}

export default function CommandBar({ normTargets, onUpdateNorm, onResetUnits }) {
    const categories = [
        { id: 'mass', label: 'Weight', icon: Scale, unit: 'kg' },
        { id: 'volume', label: 'Volume', icon: Droplet, unit: 'L' },
        { id: 'count', label: 'Count', icon: Hash, unit: 'pcs' },
    ];

    return (
        <div className="flex items-center gap-2 md:gap-4 px-2 md:px-4 h-16 bg-muted border border-border rounded-2xl shadow-sm transition-all duration-300 motion-preset-fade motion-duration-300">
            {/* Normalization Toggle */}
            <div className={clsx(
                "flex items-center gap-2 md:gap-3",
                normTargets.enabled && "pr-2 md:pr-4 border-r border-border"
            )}>
                <button
                    onClick={() => onUpdateNorm({ ...normTargets, enabled: !normTargets.enabled })}
                    className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-lg transition-colors focus:outline-none border",
                        normTargets.enabled ? "bg-primary border-transparent" : "bg-muted border-border"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-md bg-white transition-transform",
                            normTargets.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                {!normTargets.enabled && (
                    <span className="text-sm font-bold text-muted-foreground whitespace-nowrap animate-in fade-in duration-200">
                        Normalize Units
                    </span>
                )}
            </div>

            {/* Numeric Inputs */}
            {normTargets.enabled && (
                <div className="flex items-center gap-1.5 md:gap-6 animate-in fade-in slide-in-from-left-3 duration-300">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 md:gap-2 group">
                            <cat.icon className="hidden md:block w-4 h-4 text-muted-foreground" />
                            <span className="hidden md:inline text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                            <DraggableNumericInput
                                id={cat.id}
                                value={normTargets[cat.id]}
                                unit={cat.unit}
                                onChange={(newValue) => onUpdateNorm({ ...normTargets, [cat.id]: newValue })}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1" />

            {normTargets.enabled && (
                <div className="animate-in fade-in zoom-in duration-200 flex items-center justify-center">
                    <Tooltip content="Reset Units" align="right">
                        <button
                            onClick={onResetUnits}
                            className="p-1 rounded-lg transition-all duration-300 flex items-center justify-center h-[26px] w-[26px] bg-background border border-border text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"
                        >
                            <RotateCcw size={13} />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
