import React from 'react';
import { TrendingUp } from 'lucide-react';

const EmptyStateSkeleton = () => {
    return (
        <div className="relative flex-1 min-h-0 w-full h-full flex flex-col justify-center">
            
            {/* The 3 simple pulsating columns */}
            <div className="grid grid-cols-1 lg:grid-cols-[6fr_2fr_2fr] gap-4 w-full h-full animate-pulse opacity-40">
                
                {/* Column 1: Simple Chart Skeleton */}
                <div className="bg-muted rounded-3xl border border-border h-full flex flex-col p-6 gap-4">
                    {/* Command bar outline */}
                    <div className="h-14 bg-background/50 rounded-2xl w-full"></div>
                    {/* Chart area outline */}
                    <div className="flex-1 bg-background/50 rounded-2xl w-full"></div>
                </div>

                {/* Column 2: Simple Item List Skeleton */}
                <div className="bg-muted rounded-3xl border border-border h-full flex flex-col p-4 gap-3">
                    {/* Header outline */}
                    <div className="h-14 bg-background/50 rounded-2xl w-full"></div>
                    {/* Items outline */}
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-background/50 rounded-2xl w-full"></div>
                    ))}
                </div>

                {/* Column 3: Simple Details Panel Skeleton */}
                <div className="bg-muted rounded-3xl border border-border h-full flex flex-col p-4 gap-4">
                    {/* Header outline */}
                    <div className="h-14 bg-background/50 rounded-2xl w-full"></div>
                    {/* Hero area outline */}
                    <div className="aspect-square bg-background/50 rounded-2xl w-full"></div>
                    {/* Price details outline */}
                    <div className="flex-1 bg-background/50 rounded-2xl w-full"></div>
                </div>
            </div>

            {/* Crisp non-pulsating welcome card, perfectly centered on the middle of the screen */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 backdrop-blur-[2px]">
                <div className="bg-muted p-8 rounded-3xl shadow-xl border border-border text-center max-w-lg transform hover:scale-102 transition-transform duration-300">
                    <div className="bg-muted p-4 rounded-full inline-flex mb-6 ring-4 ring-border/50">
                        <TrendingUp className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Compare Prices &amp; Trends</h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        Select items from the search bar to visualize their price history, compare trends, and make smarter buying decisions.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                        <span className="bg-background border border-border px-3 py-1 rounded-full">Try &quot;Rice&quot;</span>
                        <span className="bg-background border border-border px-3 py-1 rounded-full">Try &quot;Egg&quot;</span>
                        <span className="bg-background border border-border px-3 py-1 rounded-full">Try &quot;Onion&quot;</span>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default EmptyStateSkeleton;
