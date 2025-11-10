import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, VitalRecord, FoodLogEntry, MoodLogEntry, View } from '../types';
import { analyzeSingleVitalTrend, generateBiohackingPlan } from '../services/geminiService';
import { SparklesIcon, DumbbellIcon, ScaleIcon, BrainCircuitIcon, BedIcon, ZapIcon, HeartPulseIcon, CyclingIcon, ChevronRightIcon, CloseIcon, CheckCircleIcon, AlertTriangleIcon, UploadIcon } from './Icons';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Tooltip, AreaChart, Area, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend } from 'recharts';


interface Metric { name: string; key: keyof VitalRecord; unit: string; data: { date: string, value: number }[]; icon: React.ReactNode; }
interface BiohackingDashboardProps {
    setView: (view: View) => void;
}

// --- HELPER & SUB-COMPONENTS ---

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-md ${className}`}>
        {children}
    </div>
);


const ProfileCompletionCard: React.FC<{ missingFields: string[]; onComplete: () => void; }> = ({ missingFields, onComplete }) => (
     <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500/30 p-4 rounded-2xl shadow-lg mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start">
            <AlertTriangleIcon className="w-8 h-8 text-yellow-500 flex-shrink-0" />
            <div className="ml-4">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-100">Complete Your Profile for Better Insights</h3>
                <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-200">
                    Your AI suggestions are more accurate with a complete profile. Missing: <span className="font-semibold">{missingFields.join(', ')}</span>
                </p>
            </div>
        </div>
        <button
            onClick={onComplete}
            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors shadow-md"
        >
            Update Profile
        </button>
    </div>
);

const MetricCard: React.FC<{
    title: string;
    value: string;
    unit: string;
    icon: React.ReactNode;
    onViewDetails: () => void;
}> = ({ title, value, unit, icon, onViewDetails }) => (
    <div className="flex flex-col h-full">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                {icon}
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h4>
            </div>
        </div>
        <div className="mt-auto pt-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{value} <span className="text-base font-normal text-slate-500">{unit}</span></p>
        </div>
         <button onClick={onViewDetails} className="text-left text-xs font-bold text-primary dark:text-primary-light hover:underline mt-2">View Details <ChevronRightIcon className="inline w-3 h-3"/></button>
    </div>
);

const HeartScoreCard: React.FC<{ score: number }> = ({ score }) => {
    const safeScore = isNaN(score) ? 0 : Math.round(Math.max(0, Math.min(100, score)));
    const color = safeScore > 75 ? '#22c55e' : safeScore > 50 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex flex-col items-center h-full justify-center">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">Heart Score</h4>
            <ResponsiveContainer width="100%" height={150}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: safeScore, fill: color }]} startAngle={180} endAngle={-180}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-current text-slate-900 dark:text-white">{safeScore}</text>
                    <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-current text-slate-500">Readiness</text>
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};

const WeeklyProgressCard: React.FC<{ vitals: VitalRecord[] }> = ({ vitals }) => {
    const weekData = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const record = vitals.find(v => v.date.startsWith(dateStr));
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isToday: i === 0,
            };
        }).reverse();
        return days;
    }, [vitals]);

    return (
        <div className="h-full">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">This Week's Progress</h4>
            <div className="grid grid-cols-7 gap-x-2 text-center">
                {weekData.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                         <div className={`w-10 h-10 rounded-full border-2 ${day.isToday ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}></div>
                        <span className="text-xs font-semibold text-slate-500">{day.day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DetailModal: React.FC<{ metric: Metric | null, onClose: () => void, onAnalyze: (metric: Metric) => void, analysisResult: any, isAnalysisLoading: boolean }> = ({ metric, onClose, onAnalyze, analysisResult, isAnalysisLoading }) => {
    const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('30D');

    const filteredData = useMemo(() => {
        if (!metric) return [];
        if (timeRange === 'ALL') return metric.data;
        const now = new Date();
        const days = timeRange === '7D' ? 7 : 30;
        const startDate = new Date(new Date().setDate(now.getDate() - days));
        return metric.data.filter(d => new Date(d.date) >= startDate);
    }, [metric, timeRange]);

    const tableData = useMemo(() => {
        if (!metric) return [];
        return filteredData.map((d, i) => {
            let change: string | null = null;
            if (i > 0) {
                const prevValue = filteredData[i-1].value;
                const diff = d.value - prevValue;
                if (diff !== 0) {
                    change = `${diff > 0 ? '+' : ''}${diff.toFixed(metric.unit === '' ? 0 : 1)}`;
                }
            }
            return { ...d, change };
        }).reverse(); // Show most recent first
    }, [filteredData, metric]);


    if (!metric) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">{metric.name} Trend</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => alert('Export functionality coming soon!')} className="text-xs font-semibold text-primary dark:text-primary-light hover:underline">Export</button>
                        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    <div className="flex justify-center gap-2 mb-4">
                        {(['7D', '30D', 'ALL'] as const).map(range => (
                            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeRange === range ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                {range === '7D' ? '7 Days' : range === '30D' ? '30 Days' : 'All Time'}
                            </button>
                        ))}
                    </div>
                    <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={filteredData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} fontSize={10} />
                                <YAxis domain={['dataMin - 5', 'dataMax + 5']} fontSize={10} unit={metric.unit} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9'}}/>
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Line type="monotone" dataKey="value" name={metric.name} stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <h4 className="font-bold text-md pt-2">Data Matrix</h4>
                     <div className="overflow-y-auto max-h-48 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900"><tr><th className="p-2">Date</th><th className="p-2">Value</th><th className="p-2">Change</th></tr></thead>
                            <tbody>
                                {tableData.map((d, i) => (
                                    <tr key={i} className="border-b dark:border-slate-700 last:border-0">
                                        <td className="p-2">{new Date(d.date).toLocaleDateString()}</td>
                                        <td className="p-2 font-semibold">{d.value} {metric.unit}</td>
                                        <td className={`p-2 font-semibold ${d.change?.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>{d.change || '–'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={() => onAnalyze(metric)} disabled={isAnalysisLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg disabled:opacity-50 mt-4">
                        <SparklesIcon className={`w-5 h-5 ${isAnalysisLoading ? 'animate-spin' : ''}`}/>{isAnalysisLoading ? 'Analyzing...' : 'Generate AI Analysis'}
                    </button>
                    {analysisResult && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm space-y-2 animate-fade-in">
                            <p><strong>Trend:</strong> {analysisResult.trendSummary}</p>
                            <div><strong>Observations:</strong> <ul className="list-disc list-inside ml-2">{analysisResult.keyObservations?.map((obs:string, i:number) => <li key={i}>{obs}</li>)}</ul></div>
                            <p><strong>💡 Tip:</strong> {analysisResult.educationalTip}</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const MiniChart: React.FC<{
    metricKey: keyof VitalRecord;
    title: string;
    data: VitalRecord[];
    color: string;
}> = ({ metricKey, title, data, color }) => {
    const chartData = useMemo(() => {
        return data
            .map(v => ({
                date: new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: v[metricKey] ? parseFloat(v[metricKey] as string) : null
            }))
            .filter(d => d.value !== null)
            .slice(-15); // Show last 15 data points
    }, [data, metricKey]);

    if (chartData.length < 2) {
        return <div className="h-40 flex items-center justify-center text-xs text-center text-slate-500">Not enough data to plot {title}.</div>;
    }

    return (
        <div className="h-40">
            <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400">{title}</p>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`color-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ fontSize: '10px', padding: '2px 5px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none', borderRadius: '0.5rem'}} />
                    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#color-${metricKey})`} strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};


interface GlobalAnalysisResult {
    summary: string;
    keyInsights: string[];
    recommendations: string[];
    motivation: string;
    suggestedGraphs: { title: string; metric: keyof VitalRecord }[];
    error?: string;
}

const GlobalAnalysisModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    result: GlobalAnalysisResult | null;
    isLoading: boolean;
    vitals: VitalRecord[];
}> = ({ isOpen, onClose, result, isLoading, vitals }) => {
    if (!isOpen) return null;
    
    const insightIcons = [<DumbbellIcon className="w-5 h-5"/>, <ScaleIcon className="w-5 h-5"/>, <BedIcon className="w-5 h-5"/>];
    const graphColors = ['#3b82f6', '#10b981', '#ef4444', '#f97316'];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">Today's AI-Powered Plan</h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                </header>
                <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-48">
                            <SparklesIcon className="w-10 h-10 text-primary animate-spin"/>
                            <p className="mt-2 font-semibold">Generating your personalized plan...</p>
                        </div>
                    )}
                    {result && !isLoading && (
                        result.error ? (
                            <p className="text-red-500">{result.error}</p>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">1️⃣ Summary</h4>
                                    <p className="text-sm italic text-slate-600 dark:text-slate-300">{result.summary}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">2️⃣ Key Insights</h4>
                                    <ul className="space-y-2">
                                        {result.keyInsights.map((insight, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-sm">
                                                <span className="text-primary mt-0.5">{insightIcons[i % insightIcons.length]}</span>
                                                <span>{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">3️⃣ Recommendations</h4>
                                    <ul className="space-y-2">
                                        {result.recommendations.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-sm">
                                                <span className="text-green-500 mt-0.5"><CheckCircleIcon className="w-5 h-5"/></span>
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {result.suggestedGraphs && result.suggestedGraphs.length > 0 && (
                                <div>
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">4️⃣ Suggested Visualizations</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {result.suggestedGraphs.map((graph, i) => (
                                            <MiniChart
                                                key={i}
                                                metricKey={graph.metric}
                                                title={graph.title}
                                                data={vitals}
                                                color={graphColors[i % graphColors.length]}
                                            />
                                        ))}
                                    </div>
                                </div>
                                )}
                                <p className="text-center font-semibold pt-4 border-t border-slate-200 dark:border-slate-700">"{result.motivation}"</p>
                            </div>
                        )
                    )}
                </div>
            </Card>
        </div>
    );
};



// --- MAIN COMPONENT ---
const BiohackingDashboard: React.FC<BiohackingDashboardProps> = ({ setView }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [vitals, setVitals] = useState<VitalRecord[]>([]);
    const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
    const [moodLog, setMoodLog] = useState<MoodLogEntry[]>([]);
    
    const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const [isGlobalAnalysisModalOpen, setIsGlobalAnalysisModalOpen] = useState(false);
    const [globalAnalysisResult, setGlobalAnalysisResult] = useState<GlobalAnalysisResult | null>(null);
    const [isGlobalAnalysisLoading, setIsGlobalAnalysisLoading] = useState(false);


    const safeJsonParse = <T,>(key: string, fallback: T): T => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) { return fallback; }
    };

    useEffect(() => {
        const loadAllData = () => {
            setProfile(safeJsonParse('healthpath_user_profile', {}));
            setVitals(safeJsonParse('healthpath_vitals_records', []));
            setFoodLog(safeJsonParse('healthpath_food_log', []));
            setMoodLog(safeJsonParse('healthpath_mood_log', []));
        };
        loadAllData();
        window.addEventListener('reportsUpdated', loadAllData);
        return () => window.removeEventListener('reportsUpdated', loadAllData);
    }, []);

    const missingFields = useMemo(() => {
        if (!profile) return [];
        const missing = [];
        if (!profile.dob && !profile.age) missing.push('Age / DOB');
        if (!profile.gender || profile.gender === 'Prefer not to say') missing.push('Gender');
        if (!profile.height) missing.push('Height');
        if (!profile.weight) missing.push('Weight');
        if (!profile.physicalActivity) missing.push('Activity Level');
        return missing;
    }, [profile]);

    const latestVitals = useMemo<Partial<VitalRecord>>(() => (vitals.length > 0 ? [...vitals].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : {}), [vitals]);
    const heartScore = useMemo(() => {
        const readiness = parseFloat(latestVitals.readinessScore || '0');
        const stress = parseFloat(latestVitals.stressLevel || '0');
        return (readiness + (100 - stress)) / 2;
    }, [latestVitals]);

    const metrics = useMemo<Metric[]>(() => {
        const createMetric = (name: string, key: keyof VitalRecord, unit: string, icon: React.ReactNode): Metric => ({
            name, key, unit, icon,
            data: vitals.map(v => ({ date: v.date, value: parseFloat(v[key] as string) })).filter(d => !isNaN(d.value))
        });
        const icon = <HeartPulseIcon className="w-5 h-5 text-slate-400"/>;
        return [
            createMetric('Sleep Duration', 'sleepHours', 'hrs', icon),
            createMetric('Readiness Score', 'readinessScore', '/100', icon),
            createMetric('Heart Rate Variability', 'hrv', 'ms', icon),
            createMetric('Stress Level', 'stressLevel', '/100', icon),
            createMetric('Daily Steps', 'steps', '', icon),
            createMetric('Active Calories', 'activeCalories', 'kcal', icon),
        ];
    }, [vitals]);

    const openDetailsModal = (metricKey: keyof VitalRecord) => {
        const metric = metrics.find(m => m.key === metricKey);
        if (metric) {
            setSelectedMetric(metric);
            setAnalysisResult(null);
        }
    };

    const handleAnalyzeMetric = async (metric: Metric) => {
        setIsAnalysisLoading(true);
        setAnalysisResult(null);
        try {
            const resultJson = await analyzeSingleVitalTrend(metric.name, metric.unit, metric.data);
            const parsed = JSON.parse(resultJson);
            if(parsed.error) alert(parsed.error);
            else setAnalysisResult(parsed);
        } catch(e) { alert("Failed to get AI analysis."); }
        finally { setIsAnalysisLoading(false); }
    };

    const handleGenerateGlobalAnalysis = async () => {
        if (!profile) {
            alert("Please complete your profile first for a personalized plan.");
            return;
        }
        setIsGlobalAnalysisModalOpen(true);
        setIsGlobalAnalysisLoading(true);
        setGlobalAnalysisResult(null);
        try {
            const resultJson = await generateBiohackingPlan(profile, vitals, foodLog, moodLog);
            const parsed = JSON.parse(resultJson);
            if (parsed.error) {
                setGlobalAnalysisResult({ ...parsed, summary:'', keyInsights:[], recommendations:[], motivation:'', suggestedGraphs:[] });
            } else {
                setGlobalAnalysisResult(parsed);
            }
        } catch (e) {
            setGlobalAnalysisResult({ error: "Failed to get AI analysis. Please try again.", summary:'', keyInsights:[], recommendations:[], motivation:'', suggestedGraphs:[] });
        } finally {
            setIsGlobalAnalysisLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Biohacking AI Dashboard</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Your daily AI-powered plan for health optimization.</p>
            </div>
            
            {missingFields.length > 0 && (
                <ProfileCompletionCard
                    missingFields={missingFields}
                    onComplete={() => setView('profile')}
                />
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1"><HeartScoreCard score={heartScore} /></Card>
                <Card className="lg:col-span-2"><WeeklyProgressCard vitals={vitals} /></Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {metrics.map(m => (
                    <Card key={m.key}>
                        <MetricCard title={m.name} value={latestVitals[m.key] as string || 'N/A'} unit={m.unit} icon={m.icon} onViewDetails={() => openDetailsModal(m.key)}/>
                    </Card>
                ))}
            </div>

            <Card>
                <button onClick={handleGenerateGlobalAnalysis} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-lg">
                    <SparklesIcon className="w-6 h-6"/>
                    Generate AI Analysis
                </button>
            </Card>
            
            <DetailModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} onAnalyze={handleAnalyzeMetric} analysisResult={analysisResult} isAnalysisLoading={isAnalysisLoading} />
            <GlobalAnalysisModal 
                isOpen={isGlobalAnalysisModalOpen}
                onClose={() => setIsGlobalAnalysisModalOpen(false)}
                result={globalAnalysisResult}
                isLoading={isGlobalAnalysisLoading}
                vitals={vitals}
            />
        </div>
    );
};

export default BiohackingDashboard;
