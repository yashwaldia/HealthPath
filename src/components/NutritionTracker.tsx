import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FoodLogEntry, VitalRecord, Report } from '../types';
import { compareMealImages, predictNutrientDeficiencies, analyzeSingleMealImage } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { SparklesIcon, UploadIcon, CameraIcon, TrashIcon, CloseIcon } from './Icons';

const FOOD_LOG_KEY = 'healthpath_food_log';
const VITALS_RECORDS_KEY = 'healthpath_vitals_records';
const LAB_REPORTS_KEY = 'healthpath_lab_reports';

interface MealInput {
    file: File | null;
    previewUrl: string | null;
}

interface AnalysisResult {
    meal1: any;
    meal2?: any;
    summary?: string;
}

// Sub-component for uploading/capturing meal images
const ImageUploadCard: React.FC<{
    title: string;
    onFileSelect: (file: File) => void;
    onCameraSelect: () => void;
    onRemove: () => void;
    previewUrl: string | null;
}> = ({ title, onFileSelect, onCameraSelect, onRemove, previewUrl }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{title}</h4>
            <div className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center relative bg-white dark:bg-slate-800">
                {previewUrl ? (
                    <>
                        <img src={previewUrl} alt={title} className="w-full h-full object-contain rounded-lg" />
                        <button onClick={onRemove} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"><CloseIcon className="w-4 h-4" /></button>
                    </>
                ) : (
                    <p className="text-sm text-slate-500">No image selected</p>
                )}
            </div>
            <div className="flex gap-2 w-full">
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><UploadIcon className="w-4 h-4" /> Upload</button>
                <button onClick={onCameraSelect} className="flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"><CameraIcon className="w-4 h-4" /> Capture</button>
            </div>
        </div>
    );
};


const NutritionTracker: React.FC = () => {
    const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
    const [vitals, setVitals] = useState<VitalRecord[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    
    // States for meal analysis
    const [meal1, setMeal1] = useState<MealInput>({ file: null, previewUrl: null });
    const [meal2, setMeal2] = useState<MealInput>({ file: null, previewUrl: null });
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // States for camera modal
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraForMeal, setCameraForMeal] = useState<1 | 2 | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [nutrientAnalysis, setNutrientAnalysis] = useState<{ predictions: string[], recommendations: string[] } | null>(null);

    useEffect(() => {
        try {
            const rawLog = localStorage.getItem(FOOD_LOG_KEY);
            const savedLog: FoodLogEntry[] = rawLog ? JSON.parse(rawLog) : [];
            if (Array.isArray(savedLog)) {
                const validLog = savedLog.filter(l => l && l.date);
                validLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setFoodLog(validLog);
            }
        } catch (e) { console.error("Failed to parse food log:", e); }

        try {
            const rawVitals = localStorage.getItem(VITALS_RECORDS_KEY);
            const savedVitals: VitalRecord[] = rawVitals ? JSON.parse(rawVitals) : [];
            if (Array.isArray(savedVitals)) setVitals(savedVitals);
        } catch (e) { console.error("Failed to parse vitals:", e); }

        try {
            const rawReports = localStorage.getItem(LAB_REPORTS_KEY);
            const savedReports: Report[] = rawReports ? JSON.parse(rawReports) : [];
            if (Array.isArray(savedReports)) setReports(savedReports);
        } catch (e) { console.error("Failed to parse reports:", e); }

        // Cleanup Object URLs on component unmount
        return () => {
            if (meal1.previewUrl) URL.revokeObjectURL(meal1.previewUrl);
            if (meal2.previewUrl) URL.revokeObjectURL(meal2.previewUrl);
        };
    }, []);

    const handleFileSelected = (mealNumber: 1 | 2, file: File) => {
        const previewUrl = URL.createObjectURL(file);
        if (mealNumber === 1) {
            if (meal1.previewUrl) URL.revokeObjectURL(meal1.previewUrl);
            setMeal1({ file, previewUrl });
        } else {
            if (meal2.previewUrl) URL.revokeObjectURL(meal2.previewUrl);
            setMeal2({ file, previewUrl });
        }
    };
    
    const handleRemoveMeal = (mealNumber: 1 | 2) => {
        if (mealNumber === 1) {
            if (meal1.previewUrl) URL.revokeObjectURL(meal1.previewUrl);
            setMeal1({ file: null, previewUrl: null });
        } else {
            if (meal2.previewUrl) URL.revokeObjectURL(meal2.previewUrl);
            setMeal2({ file: null, previewUrl: null });
        }
    };
    
    // --- Camera Logic ---
    const openCamera = (mealNumber: 1 | 2) => {
        setCameraForMeal(mealNumber);
        setIsCameraOpen(true);
    };

    useEffect(() => {
        const startCameraStream = async () => {
            if (isCameraOpen) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (err) {
                    setError("Could not access camera. Please check permissions.");
                    setIsCameraOpen(false);
                }
            }
        };
        startCameraStream();
    }, [isCameraOpen]);

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && cameraForMeal) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], `meal_${cameraForMeal}_capture.jpg`, { type: "image/jpeg" });
                    handleFileSelected(cameraForMeal, file);
                }
            }, 'image/jpeg');
        }
        stopCamera();
        setIsCameraOpen(false);
    };
    // --- End Camera Logic ---

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);

        try {
            if (meal1.file && meal2.file) { // Two meals comparison
                const resultJson = await compareMealImages(meal1.file, meal2.file);
                const parsedResult = JSON.parse(resultJson);
                if (parsedResult.error) {
                    setError(parsedResult.error);
                } else {
                    setAnalysisResult(parsedResult);
                }
            } else if (meal1.file || meal2.file) { // Single meal analysis
                const fileToAnalyze = meal1.file || meal2.file;
                if (!fileToAnalyze) {
                    setError("No file found to analyze.");
                    setIsLoading(false);
                    return;
                }
                const resultJson = await analyzeSingleMealImage(fileToAnalyze);
                const parsedResult = JSON.parse(resultJson);
                 if (parsedResult.error) {
                    setError(parsedResult.error);
                } else {
                    const singleMealResult: AnalysisResult = {
                        meal1: { ...parsedResult, name: parsedResult.name || (meal1.file ? "Meal 1" : "Meal 2") },
                    };
                    setAnalysisResult(singleMealResult);
                }
            } else {
                setError('Please select at least one meal image to analyze.');
            }
        } catch (e) {
            setError('Failed to parse AI response.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const comparisonChartData = useMemo(() => {
        if (!analysisResult || !analysisResult.meal2) return [];
        const { meal1, meal2 } = analysisResult;
        return [
            { name: 'Calories (kcal)', 'Meal 1': meal1.calories, 'Meal 2': meal2.calories },
            { name: 'Protein (g)', 'Meal 1': meal1.protein, 'Meal 2': meal2.protein },
            { name: 'Carbs (g)', 'Meal 1': meal1.carbs, 'Meal 2': meal2.carbs },
            { name: 'Fat (g)', 'Meal 1': meal1.fat, 'Meal 2': meal2.fat },
            { name: 'Fiber (g)', 'Meal 1': meal1.fiber, 'Meal 2': meal2.fiber },
        ];
    }, [analysisResult]);

    const deleteLogEntry = (id: string) => {
        const updatedLog = foodLog.filter(entry => entry.id !== id);
        setFoodLog(updatedLog);
        localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(updatedLog));
    };

    const handlePredictDeficiencies = async () => {
        if (foodLog.length === 0 && reports.length === 0) {
            setError('Please add some food log entries or lab reports to get an analysis.');
            return;
        }
        setIsLoading(true);
        setError('');
        setNutrientAnalysis(null);

        try {
            const resultJson = await predictNutrientDeficiencies(foodLog, reports);
            const parsedResult = JSON.parse(resultJson);
            if (parsedResult.error) {
                setError(parsedResult.error);
            } else {
                setNutrientAnalysis(parsedResult);
            }
        } catch (e) {
            setError('Failed to parse AI response for nutrient analysis.');
        } finally {
            setIsLoading(false);
        }
    };

    const calorieBalanceData = useMemo(() => {
        const dataMap = new Map<string, { date: string; consumed: number; burned: number }>();

        foodLog.forEach(entry => {
            const date = new Date(entry.date).toISOString().split('T')[0];
            if (!dataMap.has(date)) {
                dataMap.set(date, { date, consumed: 0, burned: 0 });
            }
            dataMap.get(date)!.consumed += entry.calories;
        });
        
        vitals.forEach(record => {
            const date = new Date(record.date).toISOString().split('T')[0];
            if (!dataMap.has(date)) {
                dataMap.set(date, { date, consumed: 0, burned: 0 });
            }
            if(record.totalCalories && !isNaN(parseFloat(record.totalCalories))) {
                dataMap.get(date)!.burned += parseFloat(record.totalCalories);
            }
        });
        
        const sortedData = Array.from(dataMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return sortedData.slice(-15);
    }, [foodLog, vitals]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Nutrition & Metabolic Tracker</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Log meals, track your calorie balance, and get AI-driven insights.</p>
            </div>
            
            {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg animate-fade-in">{error}</p>}

            {/* AI Meal Analyzer/Comparator */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">🍽️ AI Meal Analyzer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUploadCard title="Meal 1" onFileSelect={(f) => handleFileSelected(1, f)} onCameraSelect={() => openCamera(1)} onRemove={() => handleRemoveMeal(1)} previewUrl={meal1.previewUrl} />
                    <ImageUploadCard title="Meal 2 (Optional)" onFileSelect={(f) => handleFileSelected(2, f)} onCameraSelect={() => openCamera(2)} onRemove={() => handleRemoveMeal(2)} previewUrl={meal2.previewUrl} />
                </div>
                <button onClick={handleAnalyze} disabled={isLoading || (!meal1.file && !meal2.file)} className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400 hover:bg-primary-dark transition-colors">
                    <SparklesIcon className="w-5 h-5"/> {isLoading ? 'Analyzing...' : '🔍 Analyze Meal(s)'}
                </button>
            </div>

            {/* Analysis Results */}
            {analysisResult && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Conditional rendering for comparison vs single analysis */}
                    {analysisResult.meal2 && analysisResult.summary ? (
                        <>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4">📊 Comparison Chart</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparisonChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                            <XAxis type="number" fontSize={10} />
                                            <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: '0.5rem'}} labelStyle={{color: '#cbd5e1'}}/>
                                            <Legend wrapperStyle={{fontSize: '12px'}}/>
                                            <Bar dataKey="Meal 1" name={analysisResult.meal1.name} fill="#3b82f6" />
                                            <Bar dataKey="Meal 2" name={analysisResult.meal2.name} fill="#ef4444" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4">📋 Nutrient Matrix</h3>
                                <div className="overflow-x-auto">
                                     <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left bg-slate-100 dark:bg-slate-700/50">
                                                <th className="p-2">Nutrient</th>
                                                <th className="p-2">{analysisResult.meal1.name}</th>
                                                <th className="p-2">{analysisResult.meal2.name}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.keys(analysisResult.meal1).map(key => key !== 'name' && (
                                                <tr key={key} className="border-b border-slate-200 dark:border-slate-700">
                                                    <td className="p-2 font-medium capitalize">{key}</td>
                                                    <td className="p-2">{analysisResult.meal1[key]}</td>
                                                    <td className="p-2">{analysisResult.meal2[key]}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-primary"/> AI Summary</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{analysisResult.summary}</p>
                            </div>
                        </>
                    ) : (
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">🍽️ Nutritional Analysis for {analysisResult.meal1.name}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left bg-slate-100 dark:bg-slate-700/50">
                                            <th className="p-2">Nutrient</th>
                                            <th className="p-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(analysisResult.meal1).map(key => key !== 'name' && (
                                            <tr key={key} className="border-b border-slate-200 dark:border-slate-700">
                                                <td className="p-2 font-medium capitalize">{key}</td>
                                                <td className="p-2">{analysisResult.meal1[key]}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Calorie Balance */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">🔥 Calorie Balance (Consumed vs. Burned)</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={calorieBalanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                             <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} fontSize={10} />
                             <YAxis fontSize={10}/>
                             <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: '0.5rem'}} labelStyle={{color: '#cbd5e1'}}/>
                             <Legend wrapperStyle={{fontSize: '12px'}}/>
                             <Bar dataKey="consumed" fill="#ef4444" name="Calories In" />
                             <Bar dataKey="burned" fill="#3b82f6" name="Calories Out" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Nutrient Deficiency Predictor & Food Log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4">🧬 Nutrient Deficiency Predictor</h3>
                    <p className="text-sm text-slate-500 mb-4">AI analysis of your diet and lab reports to suggest potential nutrient gaps.</p>
                    <button onClick={handlePredictDeficiencies} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5"/> Analyze My Diet
                    </button>
                    {nutrientAnalysis && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            <div><h4 className="font-semibold mb-1">Potential Gaps</h4><ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">{nutrientAnalysis.predictions.map((p,i) => <li key={i}>{p}</li>)}</ul></div>
                            <div><h4 className="font-semibold mb-1">Recommendations</h4><ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">{nutrientAnalysis.recommendations.map((r,i) => <li key={i}>{r}</li>)}</ul></div>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4">📝 Food Log</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {foodLog.map(entry => (
                             <div key={entry.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-start gap-4">
                                {entry.image && <img src={entry.image} alt={entry.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0"/>}
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-sm">{entry.name}</p>
                                            <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => deleteLogEntry(entry.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                    <p className="text-xs mt-1"><strong>{entry.calories} kcal</strong> | P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</p>
                                </div>
                             </div>
                        ))}
                        {foodLog.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Your logged meals will appear here.</p>}
                    </div>
                </div>
            </div>

            {/* Camera Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-lg mb-4" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-4">
                        <button onClick={handleCapture} className="px-6 py-3 bg-secondary text-white font-bold rounded-lg">Capture</button>
                        <button onClick={() => { stopCamera(); setIsCameraOpen(false); }} className="px-6 py-3 bg-slate-600 text-white font-bold rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionTracker;
