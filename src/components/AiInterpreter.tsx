import React, { useState, useRef, useCallback, useEffect } from 'react';
import { interpretLabResults, extractStructuredResults } from '../services/geminiService';
import { PATHOLOGY_TESTS } from '../constants';
import { Report, TestResult, HandoffData } from '../types';
import { SparklesIcon, AlertTriangleIcon, UploadIcon, CameraIcon, EditIcon, SaveIcon, TrashIcon } from './Icons';

type InputMode = 'manual' | 'upload' | 'camera';
type Stage = 'input' | 'review' | 'interpreting' | 'result';

interface AiInterpreterProps {
    setView: (view: 'dashboard') => void;
    handoffData?: HandoffData | null;
    onHandoffConsumed: () => void;
}

const AiInterpreter: React.FC<AiInterpreterProps> = ({ setView, handoffData, onHandoffConsumed }) => {
    const [stage, setStage] = useState<Stage>('input');
    const [inputMode, setInputMode] = useState<InputMode>('upload');
    
    const [labResultText, setLabResultText] = useState('');
    const [structuredResults, setStructuredResults] = useState<Omit<TestResult, 'id'>[]>([]);
    
    const [interpretation, setInterpretation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);

    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        setIsLoading(true);
        setError('');
        
        try {
            const jsonString = await extractStructuredResults(files);
            const parsedResults = JSON.parse(jsonString);
            if (parsedResults.error) {
                 setError(parsedResults.error);
            } else {
                setStructuredResults(parsedResults);
                setStage('review');
            }
        } catch (err) {
            setError("Failed to parse AI response. The format might be incorrect.");
            setStage('input');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (handoffData && handoffData.metadata.category === 'Pathology') {
            setUploadedFiles(handoffData.files);
            setInputMode('upload');
            processFiles(handoffData.files);
            onHandoffConsumed();
        }
    }, [handoffData, onHandoffConsumed, processFiles]);

    const handleFilesSelected = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles);
            setUploadedFiles(prev => [...prev, ...newFiles]);
            if (inputMode === 'upload') {
                 processFiles(newFiles);
            }
        }
    };
    
    const removeFile = (indexToRemove: number) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files) {
            handleFilesSelected(event.dataTransfer.files);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraOn(true);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCameraOn(false);
        }
    };
    
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            stopCamera();
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                    setUploadedFiles([file]);
                    processFiles([file]);
                }
            }, 'image/jpeg');
        }
    };
    
    const handleResultChange = (index: number, field: keyof TestResult, value: string) => {
        const updatedResults = [...structuredResults];
        updatedResults[index] = { ...updatedResults[index], [field]: value };
        setStructuredResults(updatedResults);
    };

    const removeResult = (index: number) => {
        setStructuredResults(structuredResults.filter((_, i) => i !== index));
    };
    
    const saveReport = () => {
        const newReport: Report = {
            id: new Date().toISOString() + Math.random(),
            date: new Date().toISOString(),
            source: inputMode,
            results: structuredResults.map(r => ({ ...r, id: Math.random().toString() })),
            aiSummary: interpretation || ''
        };

        const existingReports: Report[] = JSON.parse(localStorage.getItem('healthpath_lab_reports') || '[]');
        localStorage.setItem('healthpath_lab_reports', JSON.stringify([newReport, ...existingReports]));

        // Notify other parts of the app that reports have been updated
        window.dispatchEvent(new Event('reportsUpdated'));

        setView('dashboard');
    };

    const getInterpretation = async () => {
        let textToInterpret = '';
        if (stage === 'review' && structuredResults.length > 0) {
            textToInterpret = structuredResults.map(r => `${r.testName}: ${r.value} ${r.unit} (Normal: ${r.normalRange})`).join('\n');
        } else if (labResultText.trim()) {
            textToInterpret = labResultText;
        } else {
            setError('No data to interpret.');
            return;
        }

        setError('');
        setIsLoading(true);
        setStage('interpreting');
        setInterpretation('');
        try {
            const result = await interpretLabResults(textToInterpret, PATHOLOGY_TESTS);
            setInterpretation(result);
            setStage('result');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            setStage('input');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Simple markdown to HTML renderer
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

    const renderInputStage = () => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                {([['upload', 'Upload File', <UploadIcon/>], ['camera', 'Use Camera', <CameraIcon/>], ['manual', 'Manual Entry', <EditIcon/>]] as const).map(([mode, label, icon]) => (
                    <button key={mode} onClick={() => setInputMode(mode)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${inputMode === mode ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <span className="w-5 h-5">{icon}</span> {label}
                    </button>
                ))}
            </div>

            {inputMode === 'manual' && (
                <>
                    <textarea value={labResultText} onChange={(e) => setLabResultText(e.target.value)} placeholder="Paste your lab results here..." className="w-full h-48 p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-primary" disabled={isLoading} />
                    <button onClick={getInterpretation} disabled={isLoading || !labResultText.trim()} className="mt-4 w-full flex items-center justify-center px-6 py-3 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400"> <SparklesIcon className="w-5 h-5 mr-2" /> Get AI Interpretation</button>
                </>
            )}

            {inputMode === 'upload' && (
                <div>
                    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center bg-slate-50/50 dark:bg-slate-700/20">
                        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Drag & drop files or click to select</h3>
                        <p className="mt-1 text-xs text-slate-500">PDF (multi-page supported), PNG, JPG</p>
                        <input type="file" multiple onChange={(e) => handleFilesSelected(e.target.files)} className="sr-only" id="file-upload" accept=".pdf,.png,.jpg,.jpeg" />
                        <label htmlFor="file-upload" className="mt-4 inline-block px-4 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-semibold rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600">Browse Files</label>
                    </div>
                    {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-semibold text-sm">Selected Files:</h4>
                            <ul className="max-h-32 overflow-y-auto space-y-2 pr-2">
                                {uploadedFiles.map((file, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                        <span className="truncate">{file.name}</span>
                                        <button onClick={() => removeFile(index)} className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {inputMode === 'camera' && (
                <div className="space-y-4">
                    {!isCameraOn ? 
                     <button onClick={startCamera} className="w-full flex items-center justify-center gap-2 p-4 bg-slate-200 dark:bg-slate-700 rounded-lg"> <CameraIcon className="w-6 h-6"/> Start Camera</button>
                     :
                     <>
                        <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                        <canvas ref={canvasRef} className="hidden" />
                        <button onClick={capturePhoto} className="w-full flex items-center justify-center gap-2 p-4 bg-red-500 text-white rounded-lg"> <CameraIcon className="w-6 h-6"/> Capture Photo</button>
                        <button onClick={stopCamera} className="w-full text-center text-sm text-slate-500 mt-2">Cancel</button>
                     </>
                    }
                </div>
            )}
        </div>
    );
    
    const renderReviewStage = () => (
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
             <h3 className="text-xl font-bold mb-4">Review Extracted Results</h3>
             <p className="text-sm text-slate-500 mb-4">AI has extracted the following data. Please review and edit if necessary before saving or interpreting.</p>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-100 dark:bg-slate-700">
                         <tr>
                             {["Test Name", "Value", "Unit", "Normal Range", "Actions"].map(h => <th key={h} className="p-2">{h}</th>)}
                         </tr>
                     </thead>
                     <tbody>
                         {structuredResults.map((res, i) => (
                             <tr key={i} className="border-b dark:border-slate-700">
                                 {(['testName', 'value', 'unit', 'normalRange'] as const).map(field => (
                                     <td key={field} className="p-1">
                                         <input type="text" value={res[field]} onChange={e => handleResultChange(i, field, e.target.value)} className="w-full p-1 bg-transparent border border-slate-300 dark:border-slate-600 rounded"/>
                                     </td>
                                 ))}
                                 <td className="p-1">
                                     <button onClick={() => removeResult(i)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><TrashIcon className="w-4 h-4"/></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
             <div className="mt-6 flex flex-col sm:flex-row gap-4">
                 <button onClick={saveReport} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-lg"><SaveIcon className="w-5 h-5"/> Save Report</button>
                 <button onClick={getInterpretation} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg"><SparklesIcon className="w-5 h-5"/> Get AI Interpretation</button>
             </div>
             <button onClick={() => { setStage('input'); setUploadedFiles([]); }} className="w-full text-center text-sm text-slate-500 mt-4">Go Back & Start Over</button>
         </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Pathology AI Interpreter</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Upload, capture, or paste your lab report to get a simple, educational interpretation.
                </p>
            </div>

            {isLoading && (
                <div className="text-center p-8">
                    <svg className="animate-spin mx-auto h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-2 text-slate-500">
                        {stage === 'review' ? 'Extracting data with AI...' : 'Generating interpretation...'}
                    </p>
                </div>
            )}
            
            {error && <p className="mb-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
            
            <div className="animate-fade-in">
                {stage === 'input' && !isLoading && renderInputStage()}
                {stage === 'review' && !isLoading && renderReviewStage()}
            </div>

            {(stage === 'result' || interpretation) && (
                <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                    <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">AI Interpretation</h3>
                    <div
                        className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                        dangerouslySetInnerHTML={renderMarkdown(interpretation)}
                    />
                    <div className="mt-6 border-t dark:border-slate-700 pt-4">
                        <button onClick={saveReport} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-lg"><SaveIcon className="w-5 h-5"/> Save this Report & Interpretation</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiInterpreter;