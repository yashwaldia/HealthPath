import React, { useState, useMemo, useEffect } from 'react';
import { PATHOLOGY_TESTS } from '../constants';
import { PathologyTest } from '../types';
import { InfoIcon } from './Icons';

interface LearningZoneProps {
    initialCompareList: string[];
}

const LearningZone: React.FC<LearningZoneProps> = ({ initialCompareList }) => {
    const [selectedTestIds, setSelectedTestIds] = useState<string[]>(['cbc', 'lft']);

    useEffect(() => {
        if (initialCompareList && initialCompareList.length > 0) {
            setSelectedTestIds(initialCompareList);
        }
    }, [initialCompareList]);

    const handleTestSelection = (testId: string) => {
        setSelectedTestIds(prev => {
            if (prev.includes(testId)) {
                return prev.filter(id => id !== testId);
            }
            if (prev.length < 3) {
                return [...prev, testId];
            }
            // If already at max, clicking a new item will swap with the first selected item
            const newSelection = [...prev.slice(1), testId];
            return newSelection;
        });
    };

    const selectedTests = useMemo(() => {
        return PATHOLOGY_TESTS
            .filter(test => selectedTestIds.includes(test.id))
            .sort((a, b) => selectedTestIds.indexOf(a.id) - selectedTestIds.indexOf(b.id)); // Maintain selection order
    }, [selectedTestIds]);

    const comparisonFeatures: { label: string; key: keyof PathologyTest }[] = [
        { label: 'Purpose', key: 'purpose' },
        { label: 'Detects', key: 'detects' },
        { label: 'Normal Range', key: 'normalRange' },
        { label: 'Sample Type', key: 'sampleType' },
        { label: 'Interpretation Tips', key: 'interpretationTips' },
    ];

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Learning Zone</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
                Compare different tests to understand their unique purposes and parameters.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Test Selection Panel */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg h-fit">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Select Tests to Compare</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">You can select up to 3 tests.</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {PATHOLOGY_TESTS.map(test => (
                            <div key={test.id} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`test-${test.id}`}
                                    checked={selectedTestIds.includes(test.id)}
                                    onChange={() => handleTestSelection(test.id)}
                                    disabled={!selectedTestIds.includes(test.id) && selectedTestIds.length >= 3}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                                />
                                <label htmlFor={`test-${test.id}`} className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {test.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comparison View */}
                <div className="lg:col-span-3">
                    {selectedTests.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-lg">
                            <div className="grid gap-px" style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${selectedTests.length}, minmax(0, 1fr))`}}>
                                {/* Header Row */}
                                <div className="font-bold text-slate-700 dark:text-slate-200 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-tl-xl">Feature</div>
                                {selectedTests.map(test => (
                                    <div key={test.id} className="font-bold text-primary dark:text-primary-light p-4 bg-slate-50 dark:bg-slate-700/50 break-words last:rounded-tr-xl">{test.name}</div>
                                ))}

                                {/* Data Rows */}
                                {comparisonFeatures.map(feature => {
                                    return (
                                        <React.Fragment key={feature.key}>
                                            <div className="font-semibold text-slate-600 dark:text-slate-300 p-4 bg-slate-50 dark:bg-slate-700/50">{feature.label}</div>
                                            {selectedTests.map(test => (
                                                <div key={test.id} className="p-4 text-sm text-slate-800 dark:text-slate-200 break-words">
                                                    {feature.key === 'normalRange' ? (
                                                        <div className="relative group flex items-center gap-1.5 cursor-help">
                                                            <span>{test[feature.key]}</span>
                                                            <InfoIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none z-10">
                                                                <h4 className="font-bold mb-1 border-b border-slate-600 pb-1">Interpretation</h4>
                                                                {test.interpretationTips}
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-800 dark:border-t-slate-900"></div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        test[feature.key]
                                                    )}
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <p className="text-slate-500 dark:text-slate-400">Select at least one test to see its details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LearningZone;