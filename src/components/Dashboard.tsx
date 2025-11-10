import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceArea } from 'recharts';
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, InfoIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardListIcon, AlertTriangleIcon } from './Icons';
import { Report, TestCategory } from '../types';
import { PATHOLOGY_TESTS } from '../constants';


const TIME_PERIODS = ['All Time', 'Last 3 Months', 'Last 6 Months', 'Last Year'];
const STATUS_FILTERS = ['All Status', 'Normal', 'Borderline', 'Abnormal'];
const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];
const CARDS_PER_PAGE = 6;


// --- HELPER FUNCTIONS ---

const getTestMetadata = (testName: string): { category: TestCategory | 'Miscellaneous', system: string } => {
    const lowerTestName = testName.toLowerCase().trim();
    
    // Prioritize exact or partial matches from our constants
    const foundTest = PATHOLOGY_TESTS.find(test => 
        lowerTestName.includes(test.name.toLowerCase().split('(')[0].trim()) ||
        test.name.toLowerCase().includes(lowerTestName)
    );

    if (foundTest) {
        return { category: foundTest.category, system: foundTest.system || 'General Health' };
    }

    // Fallback for category based on keywords
    if (lowerTestName.includes('urine')) return { category: TestCategory.URINE, system: 'Kidney' };
    if (lowerTestName.includes('stool')) return { category: TestCategory.STOOL, system: 'Gastrointestinal' };
    if (lowerTestName.includes('sputum')) return { category: TestCategory.SPUTUM, system: 'Respiratory' };
    if (lowerTestName.includes('csf') || lowerTestName.includes('cerebrospinal')) return { category: TestCategory.FLUID, system: 'Neurological' };
    if (lowerTestName.includes('blood')) return { category: TestCategory.BLOOD, system: 'General Health'};

    // Default if no match
    return { category: 'Miscellaneous', system: 'General Health' };
};


const getInterpretation = (value: number, rangeStr: string) => {
    if (typeof rangeStr !== 'string') return { status: 'N/A', color: 'bg-slate-500', textColor: 'text-slate-500', strokeColor: '#64748b' };
    const rangeMatch = rangeStr.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (!rangeMatch) return { status: 'N/A', color: 'bg-slate-500', textColor: 'text-slate-500', strokeColor: '#64748b' };
    
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    
    if (isNaN(value) || isNaN(min) || isNaN(max)) return { status: 'N/A', color: 'bg-slate-500', textColor: 'text-slate-500', strokeColor: '#64748b' };

    if (value < min || value > max) {
        return { status: 'Abnormal', color: 'bg-red-500', textColor: 'text-red-500', strokeColor: '#ef4444' };
    }
    const borderlineRange = (max - min) * 0.1;
    if (value < min + borderlineRange || value > max - borderlineRange) {
        return { status: 'Borderline', color: 'bg-yellow-500', textColor: 'text-yellow-500', strokeColor: '#f59e0b' };
    }
    return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-500', strokeColor: '#22c55e' };
};

const getTrend = (history: { date: string, value: number }[]) => {
    if (history.length < 2) return { icon: null, change: 'N/A' };
    const latest = history[history.length - 1].value;
    const previous = history[history.length - 2].value;
    if (previous === 0 && latest > 0) return { icon: <ArrowUpIcon className="w-4 h-4 text-red-500" />, change: `+inf%` };
    if (previous === 0) return { icon: null, change: 'N/A' };
    const change = ((latest - previous) / Math.abs(previous) * 100).toFixed(1);

    if (latest > previous) return { icon: <ArrowUpIcon className="w-4 h-4 text-red-500" />, change: `+${change}%` };
    if (latest < previous) return { icon: <ArrowDownIcon className="w-4 h-4 text-green-500" />, change: `${change}%` };
    return { icon: null, change: 'Stable' };
};

// --- SUB-COMPONENTS ---
const SummaryCard: React.FC<{
    title: string;
    count: number;
    countColor: string;
    items: string[];
    icon: React.ReactNode;
}> = ({ title, count, countColor, items, icon }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md transition-all">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{icon}</div>
                    <div>
                        <p className="text-sm text-slate-500">{title}</p>
                        <p className={`text-2xl font-bold ${countColor}`}>{count}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            {isExpanded && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto pr-2">
                    {items.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            {items.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">No items to display.</p>
                    )}
                </div>
            )}
        </div>
    );
};


const ReportCard: React.FC<{ report: any, isSelected: boolean, onSelect: () => void }> = ({ report, isSelected, onSelect }) => {
    if (!report.history || report.history.length === 0) return null;
    const latestResult = report.history[report.history.length - 1];
    const interpretation = getInterpretation(latestResult.value, report.normalRange);
    const trend = getTrend(report.history);

    const uniqueChartId = `chart-gradient-${report.testId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const rangeMatch = report.normalRange?.match(/([\d.]+)\s*-\s*([\d.]+)/);
    const normalRangeMin = rangeMatch ? parseFloat(rangeMatch[1]) : null;
    const normalRangeMax = rangeMatch ? parseFloat(rangeMatch[2]) : null;

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg transition-all duration-300 ${isSelected ? 'ring-2 ring-primary' : 'ring-1 ring-transparent hover:ring-primary/50'}`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{report.testName}</h3>
                    <p className="text-xs text-slate-500">{report.system}</p>
                </div>
                <input type="checkbox" checked={isSelected} onChange={onSelect} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{latestResult.value} <span className="text-sm font-normal text-slate-500">{report.unit}</span></p>
                    <div className="flex items-center gap-2 text-sm">{trend.icon}<span>{trend.change}</span></div>
                </div>
                <div className="text-xs text-slate-500 mb-3">Normal Range: {report.normalRange}</div>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${interpretation.color}`}></div>
                    <span className={`text-sm font-semibold ${interpretation.textColor}`}>{interpretation.status}</span>
                </div>
            </div>
            <div className="h-24 px-2 pb-2">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.history} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                        <defs>
                            <linearGradient id={uniqueChartId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={interpretation.strokeColor} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={interpretation.strokeColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9'}} 
                            cursor={{stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3'}}
                            formatter={(value: number) => [`${value} ${report.unit || ''}`, report.testName]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        />
                        {normalRangeMin !== null && normalRangeMax !== null && (
                           <ReferenceArea y1={normalRangeMin} y2={normalRangeMax} stroke="none" fill="#10b981" fillOpacity={0.1} />
                        )}
                        <Area type="monotone" dataKey="value" stroke="transparent" fill={`url(#${uniqueChartId})`} />
                        <Line type="monotone" dataKey="value" stroke={interpretation.strokeColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: interpretation.strokeColor }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const PaginationControls: React.FC<{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-4 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 enabled:hover:bg-slate-200 dark:enabled:hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5"/></button>
            <span className="text-sm text-slate-600 dark:text-slate-400">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 enabled:hover:bg-slate-200 dark:enabled:hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
    );
}

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard: React.FC = () => {
    const [allReports, setAllReports] = useState<any[]>([]);
    const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All Status');
    const [filterTime, setFilterTime] = useState('All Time');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
    const [initialSetupDone, setInitialSetupDone] = useState(false);

    const CATEGORIES = useMemo(() => ['All Categories', ...Object.values(TestCategory), 'Miscellaneous'], []);

    useEffect(() => {
        const loadAndProcessReports = () => {
            let savedReports: Report[] = [];
            try {
                const rawData = localStorage.getItem('healthpath_lab_reports');
                const parsed = rawData ? JSON.parse(rawData) : [];
                if (Array.isArray(parsed)) {
                    savedReports = parsed;
                }
            } catch (e) {
                console.error("Failed to parse lab reports:", e);
            }
            
            const testsData: { [key: string]: any } = {};
            savedReports.forEach(report => {
                if (!report || !Array.isArray(report.results) || !report.date) return;

                report.results.forEach(result => {
                    if (!result || typeof result.value !== 'string' || !result.testName) return;

                    const valueNum = parseFloat(result.value);
                    if (isNaN(valueNum)) return;

                    const uniqueTestName = result.testName.trim();
                    if (!testsData[uniqueTestName]) {
                        const metadata = getTestMetadata(uniqueTestName);
                        testsData[uniqueTestName] = {
                            testId: uniqueTestName.toLowerCase().replace(/\s/g, '-'),
                            testName: uniqueTestName,
                            category: metadata.category,
                            system: metadata.system,
                            unit: result.unit,
                            normalRange: result.normalRange,
                            history: []
                        };
                    }
                    if (new Date(report.date).toString() !== 'Invalid Date') {
                        testsData[uniqueTestName].history.push({ date: report.date, value: valueNum });
                    }
                });
            });
            
            Object.values(testsData).forEach(test => {
                test.history.sort((a: any, b: any) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (isNaN(dateA)) return 1;
                    if (isNaN(dateB)) return -1;
                    return dateA - dateB;
                });
            });

            const reportsArray = Object.values(testsData);
            setAllReports(reportsArray);
        };

        loadAndProcessReports();
        window.addEventListener('reportsUpdated', loadAndProcessReports);

        return () => {
            window.removeEventListener('reportsUpdated', loadAndProcessReports);
        };
    }, []);

    useEffect(() => {
        // This effect runs once when reports are loaded for the first time
        // to set a sensible default view.
        if (allReports.length > 0 && !initialSetupDone) {
            const firstCategory = allReports[0].category;
            setExpandedCategories({ [firstCategory]: true });
            setSelectedTestIds(allReports.slice(0, 2).map(r => r.testId));
            setInitialSetupDone(true);
        }
    }, [allReports, initialSetupDone]);


    const filteredAndGroupedReports = useMemo(() => {
        const now = new Date();
        let startDate = new Date(0);
        if (filterTime === 'Last 3 Months') startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        else if (filterTime === 'Last 6 Months') startDate = new Date(new Date().setMonth(now.getMonth() - 6));
        else if (filterTime === 'Last Year') startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));

        const filtered = allReports
            .map(report => ({
                ...report,
                history: report.history.filter((h: any) => new Date(h.date) >= startDate)
            }))
            .filter(report => report.history.length > 0)
            .filter(report => filterCategory === 'All Categories' || report.category === filterCategory)
            .filter(report => {
                if (filterStatus === 'All Status') return true;
                const latestResult = report.history[report.history.length - 1];
                const interpretation = getInterpretation(latestResult.value, report.normalRange);
                return interpretation.status === filterStatus.replace(' Status', '');
            })
            .filter(report => report.testName.toLowerCase().includes(searchTerm.toLowerCase()));

        return filtered.reduce((acc, report) => {
            const category = report.category || 'Miscellaneous';
            if (!acc[category]) acc[category] = [];
            acc[category].push(report);
            return acc;
        }, {} as Record<string, any[]>);

    }, [allReports, filterCategory, filterStatus, filterTime, searchTerm]);

    const comparisonChartData = useMemo(() => {
        const dateMap = new Map<string, any>();
        allReports
            .filter(r => selectedTestIds.includes(r.testId))
            .forEach(report => {
                report.history.forEach((h: any) => {
                    if (!dateMap.has(h.date)) dateMap.set(h.date, { date: h.date });
                    dateMap.get(h.date)[report.testName] = h.value;
                });
            });
        return Array.from(dateMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [allReports, selectedTestIds]);
    
    const summary = useMemo(() => {
        const reportsWithHistory = allReports.filter(r => r.history.length > 0);
        const tracked_tests = reportsWithHistory.map(r => r.testName).sort();
        const abnormal_tests = reportsWithHistory.filter(r => {
             const latest = r.history[r.history.length - 1];
             return getInterpretation(latest.value, r.normalRange).status === 'Abnormal';
        }).map(r => r.testName).sort();
        
        return { 
            total: reportsWithHistory.length, 
            abnormal: abnormal_tests.length,
            tracked_tests,
            abnormal_tests
        };
    }, [allReports]);
    
    if (allReports.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">No Reports Found</h2>
                <p className="text-slate-500 mt-2">Go to the Pathology Interpreter to add your first lab report.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Report Dashboard</h2>
                <p className="text-slate-600 dark:text-slate-400">Compare, analyze trends, and export your health reports easily.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Tests Tracked"
                    count={summary.total}
                    countColor="text-slate-900 dark:text-white"
                    items={summary.tracked_tests}
                    icon={<ClipboardListIcon className="w-8 h-8 text-primary" />}
                />
                <SummaryCard
                    title="Abnormal Results"
                    count={summary.abnormal}
                    countColor="text-red-500"
                    items={summary.abnormal_tests}
                    icon={<AlertTriangleIcon className="w-8 h-8 text-red-500" />}
                />
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow flex items-center gap-3"><InfoIcon className="w-8 h-8 text-primary flex-shrink-0"/><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Summary</p><p className="text-xs text-slate-500">Your results are mostly stable.</p></div></div>
            </div>
            <div className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 rounded-lg shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" placeholder="Search test name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary"/>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-dark text-white font-semibold rounded-lg transition-colors"><DownloadIcon className="w-5 h-5"/><span className="hidden sm:inline">Export</span></button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary">{STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select value={filterTime} onChange={e => setFilterTime(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary">{TIME_PERIODS.map(t => <option key={t} value={t}>{t}</option>)}</select>
                </div>
            </div>
            
            <div className="space-y-6">
                {Object.keys(filteredAndGroupedReports).sort().map(category => {
                    const tests = filteredAndGroupedReports[category];
                    const isExpanded = expandedCategories[category] ?? false;
                    const currentPage = categoryPages[category] || 1;
                    const totalPages = Math.ceil(tests.length / CARDS_PER_PAGE);
                    const paginatedTests = tests.slice((currentPage - 1) * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE);

                    return (
                        <div key={category} className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl shadow-md">
                            <button onClick={() => setExpandedCategories(p => ({...p, [category]: !isExpanded}))} className="w-full flex justify-between items-center text-left p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{category} ({tests.length})</h3>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {isExpanded && (
                                <div className="pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {paginatedTests.map(report => (<ReportCard key={report.testId} report={report} isSelected={selectedTestIds.includes(report.testId)} onSelect={() => setSelectedTestIds(prev => prev.includes(report.testId) ? prev.filter(id => id !== report.testId) : [...prev, report.testId])}/>))}
                                    </div>
                                    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCategoryPages(p => ({ ...p, [category]: page }))} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {Object.keys(filteredAndGroupedReports).length === 0 && (<div className="text-center py-12 text-slate-500">No reports match your filters.</div>)}

            {selectedTestIds.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Comparison Trend ({selectedTestIds.length} selected)</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={comparisonChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})} />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9'}}/>
                                <Legend />
                                {allReports.filter(r => selectedTestIds.includes(r.testId)).map((report, index) => (
                                    <Line key={report.testId} yAxisId={index % 2 === 0 ? "left" : "right"} type="monotone" dataKey={report.testName} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} activeDot={{ r: 8 }}/>
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
             <div className="text-center text-xs text-slate-500 dark:text-slate-400 p-4">Disclaimer: For educational & awareness purposes only. Not a substitute for professional medical advice.</div>
        </div>
    );
};

export default Dashboard;
