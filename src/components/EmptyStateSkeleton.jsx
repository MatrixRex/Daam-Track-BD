import React from 'react';
import { TrendingUp, BarChart3, ListFilter, ArrowDownWideNarrow, Trash2 } from 'lucide-react';

const EmptyStateSkeleton = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">

            {/* Left Column: Chart Area Skeleton (3/4 width) */}
            <div className="lg:col-span-3">
                <div className="bg-[#FFFDF8] dark:bg-[#2A2442] p-6 rounded-2xl shadow-sm border border-[#D4E6DC] dark:border-[#4A3F6B] h-[600px] relative overflow-hidden transition-colors duration-300">

                    {/* Skeleton Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-[#D4E6DC] dark:bg-[#3D3460] rounded"></div>
                            <div className="h-3 w-48 bg-[#F5E6D3] dark:bg-[#3D3460]/50 rounded"></div>
                        </div>
                    </div>

                    {/* Skeleton Controls */}
                    <div className="flex gap-4 mb-4">
                        <div className="h-8 w-24 bg-[#D4E6DC] dark:bg-[#3D3460] rounded-lg"></div>
                        <div className="h-8 w-32 bg-[#D4E6DC] dark:bg-[#3D3460] rounded-lg"></div>
                        <div className="h-8 w-64 bg-[#D4E6DC] dark:bg-[#3D3460] rounded-lg"></div>
                    </div>

                    {/* Skeleton Chart lines */}
                    <div className="h-[450px] w-full flex items-end justify-between gap-2 px-4 pb-8 opacity-20">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-full bg-[#97B897] dark:bg-[#6B5B95] rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                        ))}
                    </div>


                    {/* ABSOLUTE CENTERED WELCOME MESSAGE */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 bg-[#FFFDF8]/40 dark:bg-[#1E1A2E]/60 backdrop-blur-[1px]">
                        <div className="bg-[#FFFDF8] dark:bg-[#2A2442] p-8 rounded-3xl shadow-xl dark:shadow-[#1E1A2E]/50 border border-[#D4E6DC] dark:border-[#4A3F6B] text-center max-w-lg transform hover:scale-105 transition-transform duration-300">
                            <div className="bg-[#D4E6DC] dark:bg-[#3D3460] p-4 rounded-full inline-flex mb-6 ring-4 ring-[#D4E6DC]/50 dark:ring-[#6B5B95]/20">
                                <TrendingUp className="w-10 h-10 text-[#7A9F7A] dark:text-[#9D8EC9]" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#5C5247] dark:text-white mb-3">Compare Prices & Trends</h2>
                            <p className="text-[#8B7E6B] dark:text-[#B8AED0] mb-8 leading-relaxed">
                                Select items from the search bar to visualize their price history, compare trends, and make smarter buying decisions.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 text-sm text-[#8B7E6B] dark:text-[#6B5B95]">
                                <span className="bg-[#F5E6D3] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] px-3 py-1 rounded-full">Try "Rice"</span>
                                <span className="bg-[#F5E6D3] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] px-3 py-1 rounded-full">Try "Egg"</span>
                                <span className="bg-[#F5E6D3] dark:bg-[#3D3460] border border-[#D4E6DC] dark:border-[#4A3F6B] px-3 py-1 rounded-full">Try "Onion"</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Right Column: List Area Skeleton (1/4 width) */}
            <div className="lg:col-span-1">
                <div className="bg-[#FFFDF8] dark:bg-[#2A2442] rounded-2xl shadow-sm border border-[#D4E6DC] dark:border-[#4A3F6B] h-[600px] flex flex-col transition-colors duration-300">

                    {/* List Header Skeleton */}
                    <div className="p-4 border-b border-[#D4E6DC]/50 dark:border-[#3D3460] flex justify-between items-center">
                        <div className="space-y-1.5">
                            <div className="h-4 w-20 bg-[#D4E6DC] dark:bg-[#3D3460] rounded"></div>
                            <div className="h-3 w-12 bg-[#F5E6D3] dark:bg-[#3D3460]/50 rounded"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-7 h-7 bg-[#D4E6DC] dark:bg-[#3D3460] rounded-md"></div>
                            <div className="w-7 h-7 bg-[#D4E6DC] dark:bg-[#3D3460] rounded-md"></div>
                        </div>
                    </div>

                    {/* List Items Skeleton */}
                    <div className="p-2 space-y-2 flex-1 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3">
                                <div className="w-10 h-10 rounded-lg bg-[#D4E6DC] dark:bg-[#3D3460] flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 bg-[#D4E6DC] dark:bg-[#3D3460] rounded"></div>
                                    <div className="h-3 w-16 bg-[#F5E6D3] dark:bg-[#3D3460]/50 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div className="p-4 border-t border-[#D4E6DC]/50 dark:border-[#3D3460] bg-[#F5E6D3]/30 dark:bg-[#1E1A2E]/50 rounded-b-2xl">
                        <div className="h-3 w-32 bg-[#D4E6DC] dark:bg-[#4A3F6B] rounded mx-auto"></div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default EmptyStateSkeleton;

