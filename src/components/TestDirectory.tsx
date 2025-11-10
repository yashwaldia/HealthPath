import React, { useState, useMemo } from 'react';
import { PATHOLOGY_TESTS } from '../constants';
import { TestCategory, PathologyTest } from '../types';
import TestCard from './TestCard';
import { SearchIcon, FilterIcon } from './Icons';

interface TestDirectoryProps {
    comparisonList: string[];
    onToggleCompare: (testId: string) => void;
}

const TestDirectory: React.FC<TestDirectoryProps> = ({ comparisonList, onToggleCompare }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TestCategory | 'all'>('all');

    const categories = useMemo(() => ['all', ...Object.values(TestCategory)], []);

    const filteredTests = useMemo(() => {
        return PATHOLOGY_TESTS.filter(test => {
            const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                test.purpose.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    const comparisonTests = useMemo(() => {
        return PATHOLOGY_TESTS.filter(test => comparisonList.includes(test.id));
    }, [comparisonList]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Test Directory</h2>
                <p className="text-slate-600 dark:text-slate-400">Browse, search, and learn about a wide range of pathology tests.</p>
            </div>
            
            <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 py-4 -mx-4 px-4 rounded-md">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search for a test (e.g., CBC, Liver Function)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition"
                        />
                    </div>
                    <div className="relative">
                         <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as TestCategory | 'all')}
                            className="w-full md:w-auto pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition appearance-none"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {filteredTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTests.map(test => (
                        <TestCard 
                            key={test.id} 
                            test={test} 
                            isInCompare={comparisonList.includes(test.id)}
                            onToggleCompare={onToggleCompare}
                            comparisonTests={comparisonTests}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">No tests found matching your criteria.</p>
                </div>
            )}
        </div>
    );
};

export default TestDirectory;