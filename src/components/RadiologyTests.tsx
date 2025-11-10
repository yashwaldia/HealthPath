import React, { useState, useMemo } from 'react';
import { RADIOLOGY_TESTS } from '../constants';
import { RadiologyCategory, RadiologyTest } from '../types';
import { SearchIcon, ChevronDownIcon } from './Icons';

interface GroupedRadiologyTests {
  [category: string]: {
    [subCategory: string]: RadiologyTest[];
  };
}

const RadiologyTestTable: React.FC<{ tests: RadiologyTest[] }> = ({ tests }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-300 uppercase">
        <tr>
          <th className="px-4 py-2 font-semibold">Test Name</th>
          <th className="px-4 py-2 font-semibold">Purpose</th>
        </tr>
      </thead>
      <tbody>
        {tests.map(test => (
          <tr key={test.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{test.name}</td>
            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{test.purpose}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RadiologyTests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
      [RadiologyCategory.BASIC]: true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredAndGrouped = useMemo(() => {
    const filtered = RADIOLOGY_TESTS.filter(test =>
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, test) => {
      const { category, subCategory } = test;
      if (!acc[category]) {
        acc[category] = {};
      }
      if (!acc[category][subCategory]) {
        acc[category][subCategory] = [];
      }
      acc[category][subCategory].push(test);
      return acc;
    }, {} as GroupedRadiologyTests);
  }, [searchTerm]);
  
  const categoryOrder = Object.values(RadiologyCategory);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Radiology Test Directory</h2>
        <p className="text-slate-600 dark:text-slate-400">An informational guide to various imaging and radiology procedures.</p>
      </div>

      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 py-4 -mx-4 px-4 rounded-md">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search for a test (e.g., MRI, Chest X-Ray)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition"
          />
        </div>
      </div>

      <div className="space-y-4">
        {categoryOrder.map(category => {
          const subCategories = filteredAndGrouped[category];
          if (!subCategories) return null;
          const isExpanded = expandedCategories[category] ?? false;
          
          return (
            <div key={category} className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex justify-between items-center p-4 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/80"
              >
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{category}</h3>
                <ChevronDownIcon className={`w-6 h-6 transition-transform text-slate-500 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {Object.keys(subCategories).map(subCategory => (
                    <div key={subCategory}>
                      <h4 className="text-md font-semibold text-primary dark:text-primary-light mb-2">{subCategory}</h4>
                      <RadiologyTestTable tests={subCategories[subCategory]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
       {Object.keys(filteredAndGrouped).length === 0 && (
          <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No tests found matching your criteria.</p>
          </div>
      )}
    </div>
  );
};

export default RadiologyTests;