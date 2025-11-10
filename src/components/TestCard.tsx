import React, { useState, useMemo } from 'react';
import { PathologyTest } from '../types';
import { ChevronDownIcon, PlusCircleIcon, CheckCircleIcon } from './Icons';

interface TestCardProps {
    test: PathologyTest;
    isInCompare: boolean;
    onToggleCompare: (testId: string) => void;
    comparisonTests: PathologyTest[];
}

const DetailRow: React.FC<{ label: string; value: string; highlighted?: boolean }> = ({ label, value, highlighted }) => (
    <div className={`py-2 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300 ${highlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded-md -mx-2 px-2' : ''}`}>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
    </div>
);


const TestCard: React.FC<TestCardProps> = ({ test, isInCompare, onToggleCompare, comparisonTests }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const isMultiCompare = isInCompare && comparisonTests.length > 1;

    const highlightNormalRange = useMemo(() => {
        if (!isMultiCompare) return false;
        const uniqueRanges = new Set(comparisonTests.map(t => t.normalRange));
        return uniqueRanges.size > 1;
    }, [isMultiCompare, comparisonTests]);

    const highlightInterpTips = useMemo(() => {
        if (!isMultiCompare) return false;
        const uniqueTips = new Set(comparisonTests.map(t => t.interpretationTips));
        return uniqueTips.size > 1;
    }, [isMultiCompare, comparisonTests]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="p-6">
                <h3 className="text-lg font-bold text-primary dark:text-primary-light">{test.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{test.category}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 h-10 overflow-hidden">{test.purpose}</p>
            </div>

            {isExpanded && (
                <div className="p-6 pt-0 space-y-1">
                    <DetailRow label="What it Detects" value={test.detects} />
                    <DetailRow label="Normal Range" value={test.normalRange} highlighted={highlightNormalRange} />
                    <DetailRow label="System" value={test.system || 'General Health'} />
                    <DetailRow label="Sample Type" value={test.sampleType} />
                    <DetailRow label="Interpretation Tips" value={test.interpretationTips} highlighted={highlightInterpTips} />
                </div>
            )}

            <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 flex justify-between items-center text-sm font-semibold text-primary dark:text-primary-light hover:underline"
                >
                    <span>{isExpanded ? 'Show Less' : 'Show Details'}</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <button
                    onClick={() => onToggleCompare(test.id)}
                    className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        isInCompare 
                        ? 'bg-secondary/20 text-secondary-dark dark:text-secondary-light'
                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                >
                    {isInCompare ? <CheckCircleIcon className="w-4 h-4" /> : <PlusCircleIcon className="w-4 h-4" />}
                    {isInCompare ? 'Added' : 'Compare'}
                </button>
            </div>
        </div>
    );
};

export default TestCard;