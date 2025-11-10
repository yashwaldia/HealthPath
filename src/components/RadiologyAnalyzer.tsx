import React, { useState, useEffect } from 'react';
import { RadiologyReport, HandoffData } from '../types';
import { analyzeRadiologyReport } from '../services/geminiService';
import { UploadIcon, TrashIcon, SparklesIcon, SaveIcon, ClipboardListIcon, ChevronDownIcon } from './Icons';

const RADIOLOGY_TYPES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammogram', 'PET-CT', 'Other'];
const LOCAL_STORAGE_KEY = 'healthpath_radiology_reports';

interface RadiologyAnalyzerProps {
    handoffData?: HandoffData | null;
    onHandoffConsumed: () => void;
}

const RadiologyAnalyzer: React.FC<RadiologyAnalyzerProps> = ({ handoffData, onHandoffConsumed }) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [reportType, setReportType] = useState<string>(RADIOLOGY_TYPES[0]);
    const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [currentAnalysis, setCurrentAnalysis] = useState<RadiologyReport['analysis'] | null>(null);

    const [historicalReports, setHistoricalReports] = useState<RadiologyReport[]>([]);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const savedReports: RadiologyReport[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        savedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistoricalReports(savedReports);
    }, []);

    useEffect(() => {
        if (handoffData && handoffData.metadata.category === 'Radiology') {
            setUploadedFiles(handoffData.files);
            
            // Check if the detected name is a standard type, otherwise default or use 'Other'
            const detectedType = handoffData.metadata.detectedName;
            const isStandardType = RADIOLOGY_TYPES.some(t => detectedType.toLowerCase().includes(t.toLowerCase()));
            setReportType(isStandardType ? RADIOLOGY_TYPES.find(t => detectedType.toLowerCase().includes(t.toLowerCase())) || 'Other' : 'Other');
            
            if (handoffData.metadata.detectedDate) {
                setTestDate(handoffData.metadata.detectedDate);
            }
            onHandoffConsumed();
        }
    }, [handoffData, onHandoffConsumed]);


    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            setUploadedFiles(prev => [...prev, ...Array.from(selectedFiles)]);
        }
    };
    
    const handleRemoveFile = (indexToRemove: number) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAnalyze = async () => {
        if (uploadedFiles.length === 0) {
            setError('Please upload at least one report file.');
            return;
        }
        setIsLoading(true);
        setError('');
        setCurrentAnalysis(null);

        // Find the most recent previous report of the same type for comparison
        const previousReport = historicalReports
            .filter(r => r.type === reportType)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const previousSummary = previousReport ? JSON.stringify(previousReport.analysis) : undefined;

        try {
            const resultJson = await analyzeRadiologyReport(uploadedFiles, reportType, testDate, previousSummary);
            const parsedResult = JSON.parse(resultJson);
            if (parsedResult.error) {
                setError(parsedResult.error);
            } else {
                setCurrentAnalysis(parsedResult);
            }
        } catch (e) {
            setError('Failed to parse the AI response. It might be malformed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveReport = () => {
        if (!currentAnalysis) return;
        const newReport: RadiologyReport = {
            id: new Date().toISOString() + Math.random(),
            type: reportType,
            date: testDate,
            fileName: uploadedFiles.map(f => f.name).join(', '),
            analysis: currentAnalysis,
        };
        
        const updatedReports = [newReport, ...historicalReports];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedReports));
        setHistoricalReports(updatedReports);
        
        // Notify other components like the AI Health Report
        window.dispatchEvent(new Event('reportsUpdated'));
        
        // Reset state for next analysis
        setCurrentAnalysis(null);
        setUploadedFiles([]);
    };

    const AnalysisResult: React.FC<{ analysis: RadiologyReport['analysis'] }> = ({ analysis }) => (
        <div className="space-y-4">
            <div>
                <h4 className="font-bold text-lg mb-2 text-primary dark:text-primary-light">AI Summary</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {analysis.summaryPoints.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
            </div>
             <div>
                <h4 className="font-bold text-lg mb-2 text-primary dark:text-primary-light">Key Findings</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.keyFindings}</p>
            </div>
            <div>
                <h4 className="font-bold text-lg mb-2 text-primary dark:text-primary-light">Comparison to Previous</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.comparisonToPrevious}</p>
            </div>
             <div>
                <h4 className="font-bold text-lg mb-2 text-primary dark:text-primary-light">Educational Recommendations</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.recommendations}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Radiology AI Analyzer</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Upload radiology reports for an AI-powered educational analysis and track your history.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">New Report Analysis</h3>
                
                {/* Uploader */}
                <div 
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    className={`border-2 border-dashed rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-700/20 transition-colors ${isDragging ? 'border-primary bg-primary-light/20 dark:bg-primary-dark/20' : 'border-slate-300 dark:border-slate-600'}`}
                >
                    <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Drag & drop files or click to browse</p>
                    <input type="file" multiple onChange={(e) => handleFileChange(e.target.files)} className="sr-only" id="radiology-file-upload" accept=".jpg,.jpeg,.png,.pdf,.dcm" />
                    <label htmlFor="radiology-file-upload" className="mt-2 text-xs font-semibold text-primary dark:text-primary-light cursor-pointer">SELECT FILES</label>
                </div>
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        <ul className="max-h-28 overflow-y-auto space-y-2 pr-2">
                            {uploadedFiles.map((file, index) => (
                                <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                    <span className="truncate">{file.name}</span>
                                    <button onClick={() => handleRemoveFile(index)} className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                            {RADIOLOGY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Test</label>
                        <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                    </div>
                </div>

                <button onClick={handleAnalyze} disabled={isLoading || uploadedFiles.length === 0} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400 hover:bg-primary-dark transition-colors">
                    <SparklesIcon className="w-5 h-5"/>
                    {isLoading ? 'Analyzing...' : `Analyze ${uploadedFiles.length} File(s)`}
                </button>
            </div>

            {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
            
            {currentAnalysis && (
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in-up">
                    <AnalysisResult analysis={currentAnalysis} />
                    <button onClick={handleSaveReport} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-secondary-dark transition-colors">
                        <SaveIcon className="w-5 h-5"/> Save Report Analysis
                    </button>
                 </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex items-center gap-3">
                    <ClipboardListIcon className="w-6 h-6 text-primary"/>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Historical Reports</h3>
                </div>
                {historicalReports.length > 0 ? (
                    <div className="space-y-2">
                        {historicalReports.map(report => (
                             <div key={report.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <button onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)} className="w-full flex justify-between items-center p-3 text-left">
                                    <div>
                                        <p className="font-semibold">{report.type} - <span className="font-normal">{new Date(report.date).toLocaleDateString()}</span></p>
                                        <p className="text-xs text-slate-500">{report.fileName}</p>
                                    </div>
                                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${expandedReportId === report.id ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedReportId === report.id && (
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-600 animate-fade-in">
                                        <AnalysisResult analysis={report.analysis} />
                                    </div>
                                )}
                             </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No saved radiology reports yet. Your saved analyses will appear here.</p>
                )}
            </div>
            
        </div>
    );
};

export default RadiologyAnalyzer;