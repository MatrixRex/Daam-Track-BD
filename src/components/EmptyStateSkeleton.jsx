import React from 'react';
import { TrendingUp, BarChart3, ListFilter, ArrowDownWideNarrow, Trash2 } from 'lucide-react';

const EmptyStateSkeleton = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">

            {/* Left Column: Chart Area Skeleton (3/4 width) */}
            <div className="lg:col-span-3">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[600px] relative overflow-hidden">

                    {/* Skeleton Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-slate-100 rounded"></div>
                            <div className="h-3 w-48 bg-slate-50 rounded"></div>
                        </div>
                    </div>

                    {/* Skeleton Controls */}
                    <div className="flex gap-4 mb-4">
                        <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-100 rounded-lg"></div>
                        <div className="h-8 w-64 bg-slate-100 rounded-lg"></div>
                    </div>

                    {/* Skeleton Chart lines */}
                    <div className="h-[450px] w-full flex items-end justify-between gap-2 px-4 pb-8 opacity-20">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-full bg-slate-100 rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                        ))}
                    </div>


                    {/* ABSOLUTE CENTERED WELCOME MESSAGE */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 bg-white/40 backdrop-blur-[1px]">
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100 text-center max-w-lg transform hover:scale-105 transition-transform duration-300">
                            <div className="bg-blue-50 p-4 rounded-full inline-flex mb-6 ring-4 ring-blue-50/50">
                                <TrendingUp className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Compare Prices & Trends</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Select items from the search bar to visualize their price history, compare trends, and make smarter buying decisions.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-400">
                                <span className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">Try "Rice"</span>
                                <span className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">Try "Egg"</span>
                                <span className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">Try "Onion"</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Right Column: List Area Skeleton (1/4 width) */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[600px] flex flex-col">

                    {/* List Header Skeleton */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="space-y-1.5">
                            <div className="h-4 w-20 bg-slate-100 rounded"></div>
                            <div className="h-3 w-12 bg-slate-50 rounded"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-7 h-7 bg-slate-100 rounded-md"></div>
                            <div className="w-7 h-7 bg-slate-100 rounded-md"></div>
                        </div>
                    </div>

                    {/* List Items Skeleton */}
                    <div className="p-2 space-y-2 flex-1 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 bg-slate-100 rounded"></div>
                                    <div className="h-3 w-16 bg-slate-50 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                        <div className="h-3 w-32 bg-slate-200 rounded mx-auto"></div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default EmptyStateSkeleton;
