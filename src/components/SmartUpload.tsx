import React, { useState } from 'react';
import { analyzeUploadedFileType } from '../services/geminiService';
import { DetectedFileInfo, View, HandoffData } from '../types';
import { UploadCloudIcon, TrashIcon, SparklesIcon, TestTubeIcon, RadiologyIcon, EditIcon, BrainCircuitIcon, ScanIcon } from './Icons';

interface SmartUploadProps {
    setView: (view: View) => void;
    setHandoffData: (data: HandoffData) => void;
}

type AnalyzedFile = DetectedFileInfo & { file: File };

const SmartUpload: React.FC<SmartUploadProps> = ({ setView, setHandoffData }) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const [detectionResults, setDetectionResults] = useState<AnalyzedFile[] | null>(null);

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            setUploadedFiles(Array.from(selectedFiles));
            setDetectionResults(null);
            setError('');
        }
    };
    
    const handleRemoveFile = (indexToRemove: number) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        // Also remove the corresponding result if it exists
        if (detectionResults) {
            setDetectionResults(prev => prev!.filter((_, index) => index !== indexToRemove));
        }
    };

    const handleAnalyze = async () => {
        if (uploadedFiles.length === 0) {
            setError('Please upload at least one file to analyze.');
            return;
        }
        setIsLoading(true);
        setError('');
        setDetectionResults(null);

        try {
            const resultJson = await analyzeUploadedFileType(uploadedFiles);
            const parsedResultsArray: DetectedFileInfo[] | { error: string } = JSON.parse(resultJson);

            if (Array.isArray(parsedResultsArray) && parsedResultsArray.length === uploadedFiles.length) {
                const combinedResults = uploadedFiles.map((file, index) => ({
                    file,
                    ...parsedResultsArray[index],
                }));
                setDetectionResults(combinedResults);
            } else if (typeof parsedResultsArray === 'object' && 'error' in parsedResultsArray) {
                setError(parsedResultsArray.error);
            }
            else {
                setError("AI analysis did not return a result for each file. Please try uploading files one by one.");
            }
        } catch (e) {
            setError('Failed to parse the AI response. It might be malformed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceed = (result: AnalyzedFile) => {
        const { file, ...metadata } = result;
        const handoff: HandoffData = {
            files: [file], // Handoff only the selected file
            metadata: metadata,
        };
        setHandoffData(handoff);

        switch (metadata.category) {
            case 'Pathology':
                setView('interpreter');
                break;
            case 'Radiology':
                setView('radiology-analyzer');
                break;
            default:
                setView('interpreter'); // Default to interpreter for manual review
                break;
        }
    };
    
    const getCategoryDetails = (category: DetectedFileInfo['category']) => {
        switch(category) {
            case 'Pathology':
                return { icon: <TestTubeIcon className="w-8 h-8 text-blue-500" />, label: 'Pathology Report', buttonIcon: <BrainCircuitIcon className="w-5 h-5"/>, buttonText: 'Proceed to Pathology Interpreter'};
            case 'Radiology':
                return { icon: <RadiologyIcon className="w-8 h-8 text-indigo-500" />, label: 'Radiology Report', buttonIcon: <ScanIcon className="w-5 h-5"/>, buttonText: 'Proceed to Radiology AI Analyzer'};
            default:
                return { icon: <EditIcon className="w-8 h-8 text-slate-500" />, label: 'Other Document', buttonIcon: <BrainCircuitIcon className="w-5 h-5"/>, buttonText: 'Proceed with Manual Review'};
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Smart Upload</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Upload any medical file. Our AI will automatically detect, classify, and route it for you.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
                <div 
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    className={`border-2 border-dashed rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-700/20 transition-colors ${isDragging ? 'border-primary bg-primary-light/20 dark:bg-primary-dark/20' : 'border-slate-300 dark:border-slate-600'}`}
                >
                    <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Drag & drop files or click to browse</p>
                    <input type="file" multiple onChange={(e) => handleFileChange(e.target.files)} className="sr-only" id="smart-file-upload" accept=".jpg,.jpeg,.png,.pdf,.dcm" />
                    <label htmlFor="smart-file-upload" className="mt-2 text-xs font-semibold text-primary dark:text-primary-light cursor-pointer">SELECT FILES</label>
                </div>

                {uploadedFiles.length > 0 && !detectionResults && (
                    <div className="space-y-2 animate-fade-in">
                        <ul className="max-h-32 overflow-y-auto space-y-2 pr-2">
                            {uploadedFiles.map((file, index) => (
                                <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                    <span className="truncate">{file.name}</span>
                                    <button onClick={() => handleRemoveFile(index)} className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </li>
                            ))}
                        </ul>
                        <button onClick={handleAnalyze} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400 hover:bg-primary-dark transition-colors">
                            <SparklesIcon className="w-5 h-5"/>
                            {isLoading ? 'Analyzing...' : `Analyze ${uploadedFiles.length} File(s)`}
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg animate-fade-in">{error}</p>}
            
            {(isLoading && !detectionResults) && (
                 <div className="text-center p-8">
                    <svg className="animate-spin mx-auto h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-2 text-slate-500">AI is analyzing your files...</p>
                </div>
            )}

            {detectionResults && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in-up">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Detection Results</h3>
                    <div className="space-y-4">
                        {detectionResults.map((result, index) => {
                            const categoryDetails = getCategoryDetails(result.category);
                            return (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                    <p className="font-bold truncate text-sm mb-2 text-slate-700 dark:text-slate-200">{result.file.name}</p>
                                    <div className="flex items-center gap-4">
                                        {categoryDetails.icon}
                                        <div>
                                            <p className="text-sm text-slate-500">Detected Category</p>
                                            <p className="font-bold text-lg">{categoryDetails.label}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs mt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-slate-600 dark:text-slate-300">Report Name:</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-right">{result.detectedName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-slate-600 dark:text-slate-300">Report Date:</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-100">{result.detectedDate}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleProceed(result)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-secondary-dark transition-colors">
                                        {categoryDetails.buttonIcon}
                                        {categoryDetails.buttonText}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartUpload;