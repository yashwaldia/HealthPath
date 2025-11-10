import React, { useState, useMemo, useEffect } from 'react';
import { Report, TestCategory, TestResult } from '../types';
import { PATHOLOGY_TESTS } from '../constants';
import { analyzeHistoricalReport } from '../services/geminiService';
import { SearchIcon, DownloadIcon, SparklesIcon, CloseIcon } from './Icons';

const getTestCategory = (testName: string): TestCategory | 'Miscellaneous' => {
    const foundTest = PATHOLOGY_TESTS.find(test => test.name.toLowerCase().includes(testName.toLowerCase()));
    return foundTest ? foundTest.category : 'Miscellaneous';
};

const renderMarkdown = (text: string) => {
    let html = text
        .replace(/\*\*\*(.*?)\*\*\*/g, '<div class="p-4 my-4 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 rounded-r-lg"><strong>$1</strong></div>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\s*-\s(.*?)(?=\n\s*-|\n\n|$)/g, '<li class="ml-5 list-disc">$1</li>')
        .replace(/(\d\.\s)/g, '<br/><br/><strong>')
        .replace(/(<\/strong>)/g, '$1<br/>')
        .replace(/\n/g, '<br />');
    return { __html: html };
};

// --- MODAL COMPONENT ---
const ReportDetailModal: React.FC<{
    report: Report | null;
    onClose: () => void;
    onAnalyze: (report: Report) => void;
    analysis: string;
    isLoading: boolean;
}> = ({ report, onClose, onAnalyze, analysis, isLoading }) => {
    if (!report) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold">Report Details</h3>
                        <p className="text-sm text-slate-500">
                            {new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-6 h-6"/></button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Test Results</h4>
                        <div className="space-y-3">
                            {report.results.map(result => (
                                <div key={result.id} className="grid grid-cols-2 gap-4 items-center border-b border-slate-200 dark:border-slate-700 pb-3 last:border-b-0">
                                    <div>
                                        <p className="font-semibold text-sm">{result.testName}</p>
                                        <p className="text-xs text-slate-500">Normal Range: {result.normalRange}</p>
                                    </div>
                                    <p className="text-right font-medium text-sm">{result.value} {result.unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                         <button onClick={() => onAnalyze(report)} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400 hover:bg-primary-dark transition-colors">
                            <SparklesIcon className="w-5 h-5"/>
                            {isLoading ? 'Analyzing...' : 'Analyze this Report with AI'}
                        </button>
                        
                        {analysis && (
                            <div className="mt-6">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                    <h5 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">AI Analysis</h5>
                                    <div
                                        className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm"
                                        dangerouslySetInnerHTML={renderMarkdown(analysis)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- CARD COMPONENT ---
const HistoricalReportCard: React.FC<{ report: Report; onView: () => void }> = ({ report, onView }) => {
    const testCount = report.results.length;
    const summaryTests = report.results.slice(0, 3).map(r => r.testName).join(', ');

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col p-6 space-y-4">
            <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">{new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-slate-500">Contains {testCount} test(s)</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 flex-1">
                <p className="font-medium">Includes:</p>
                <p className="italic">{summaryTests}{testCount > 3 ? '...' : ''}</p>
            </div>
            <button onClick={onView} className="w-full mt-auto px-4 py-2 bg-primary-light/20 text-primary-dark dark:text-primary-light font-semibold rounded-lg hover:bg-primary-light/30 transition-colors">
                View Full Report
            </button>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const HistoricalDashboard: React.FC = () => {
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterDate, setFilterDate] = useState('All Time');

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const categories = useMemo(() => ['All', ...Object.values(TestCategory), 'Miscellaneous'], []);

    const loadReports = () => {
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
        // FIX: Filter for valid reports before sorting to prevent crashes.
        const validReports = savedReports.filter(r => r && r.date);
        validReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllReports(validReports);
    };

    useEffect(() => {
        loadReports();
        window.addEventListener('reportsUpdated', loadReports);
        return () => window.removeEventListener('reportsUpdated', loadReports);
    }, []);

    const filteredReports = useMemo(() => {
        const now = new Date();
        let startDate = new Date(0);
        if (filterDate === 'Last 7 Days') startDate = new Date(new Date().setDate(now.getDate() - 7));
        else if (filterDate === 'Last 30 Days') startDate = new Date(new Date().setDate(now.getDate() - 30));

        return allReports
            .filter(report => new Date(report.date) >= startDate)
            .filter(report => {
                if (filterCategory === 'All') return true;
                return report.results.some(result => getTestCategory(result.testName) === filterCategory);
            })
            .filter(report => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return new Date(report.date).toLocaleDateString().includes(lowerSearch) ||
                       report.results.some(r => r.testName.toLowerCase().includes(lowerSearch));
            });
    }, [allReports, searchTerm, filterCategory, filterDate]);

    const handleViewReport = (report: Report) => {
        setSelectedReport(report);
        setAiAnalysis('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedReport(null);
    };
    
    const handleAnalyze = async (report: Report) => {
        setIsAiLoading(true);
        setAiAnalysis('');
        try {
            const analysis = await analyzeHistoricalReport(report);
            setAiAnalysis(analysis);
        } catch (error) {
            setAiAnalysis("Sorry, an error occurred while analyzing the report.");
            console.error(error);
        } finally {
            setIsAiLoading(false);
        }
    };

    if (allReports.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">No Historical Reports</h2>
                <p className="text-slate-500 mt-2">Your saved reports will appear here once you add them via the Pathology Interpreter.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Historical Dashboard</h2>
                <p className="text-slate-600 dark:text-slate-400">Review, analyze, and manage your past health reports.</p>
            </div>

            <div className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 rounded-lg shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" placeholder="Search by test name or date..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary"/>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-dark text-white font-semibold rounded-lg transition-colors"><DownloadIcon className="w-5 h-5"/>Export</button>
                </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary">
                        {['All Time', 'Last 7 Days', 'Last 30 Days'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map(report => (
                        <HistoricalReportCard key={report.id} report={report} onView={() => handleViewReport(report)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">No reports match your filters.</div>
            )}
            
            {isModalOpen && <ReportDetailModal report={selectedReport} onClose={handleCloseModal} onAnalyze={handleAnalyze} analysis={aiAnalysis} isLoading={isAiLoading} />}
        </div>
    );
};

export default HistoricalDashboard;