import React, { useState, useEffect, useMemo } from 'react';
import { VitalRecord } from '../types';
import { analyzeVitalsTrends, compareVitalsTrends } from '../services/geminiService';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, RadialBarChart, RadialBar, PolarAngleAxis, AreaChart, Area } from 'recharts';
import { SparklesIcon, PlusCircleIcon, CloseIcon, SaveIcon, EditIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ArrowUpTrayIcon, TableCellsIcon, ShareIcon } from './Icons';
import BluetoothHealthSync from './BluetoothHealthSync';


const LOCAL_STORAGE_KEY = 'healthpath_vitals_records';

// --- HELPER & CONFIG ---

const getVitalStatus = (type: string, value1: number, value2?: number): 'normal' | 'alert' | 'critical' => {
  if (isNaN(value1)) return 'normal';
  switch (type) {
    case 'Blood Pressure':
      if (isNaN(value2!)) return 'normal';
      if (value1 < 90 || value2! < 60) return 'alert'; // Low
      if (value1 >= 140 || value2! >= 90) return 'critical';
      if (value1 >= 121 || value2! >= 81) return 'alert';
      return 'normal';
    case 'Blood Sugar':
      if (value1 < 70) return 'alert';
      if (value1 >= 126) return 'critical';
      if (value1 >= 100) return 'alert';
      return 'normal';
    case 'Heart Rate':
    case 'Pulse Rate':
      if (value1 < 60 || value1 > 100) return 'alert';
      return 'normal';
    case 'Oxygen Saturation':
       if (value1 < 92) return 'critical';
       if (value1 < 95) return 'alert';
       return 'normal';
    case 'Temperature':
      if (value1 < 35) return 'alert';
      if (value1 >= 38) return 'critical';
      if (value1 > 37.2) return 'alert';
      return 'normal';
    default:
      return 'normal';
  }
};

const statusConfig = {
  normal: { text: 'Normal', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300', dot: '#22c55e' },
  alert: { text: 'Alert', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300', dot: '#f59e0b' },
  critical: { text: 'Critical', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300', dot: '#ef4444' }
};

const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

// --- SUB-COMPONENTS ---
const QuickFillPanel: React.FC<{ onSave: (data: Partial<VitalRecord>) => void }> = ({ onSave }) => {
    const [data, setData] = useState<Partial<VitalRecord>>({});
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };
    const handleSave = () => {
        onSave(data);
        setData({});
    };

    const fields = [
        { name: 'bloodPressure', label: 'BP (mmHg)', fields: ['bloodPressureSystolic', 'bloodPressureDiastolic'], separator: '/' },
        { name: 'bloodSugar', label: 'Sugar (mg/dL)', fields: ['bloodSugarFasting', 'bloodSugarPostMeal'], separator: ' ' },
        { name: 'weightKg', label: 'Weight (kg)' }, { name: 'temperature', label: 'Temp (°C)' },
        { name: 'pulseRate', label: 'Pulse (bpm)' }, { name: 'oxygenSaturation', label: 'O₂ (%)' },
        { name: 'respirationRate', label: 'Resp (br/min)' }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">🩺 Quick Update (Today)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {fields.map(f => (
                    <div key={f.name} className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">{f.label}</label>
                        {f.fields ? (
                            <div className="flex items-center gap-1">
                                <input type="number" name={f.fields[0]} value={(data as any)[f.fields[0]] || ''} onChange={handleChange} className="w-full p-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"/>
                                <span>{f.separator}</span>
                                <input type="number" name={f.fields[1]} value={(data as any)[f.fields[1]] || ''} onChange={handleChange} className="w-full p-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"/>
                            </div>
                        ) : (
                            <input type="number" name={f.name} value={(data as any)[f.name] || ''} onChange={handleChange} className="w-full p-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"/>
                        )}
                    </div>
                ))}
                <div className="flex flex-col justify-end">
                    <button onClick={handleSave} className="w-full h-full px-4 py-2 bg-secondary text-white font-semibold rounded-lg text-sm">💾 Save All</button>
                </div>
            </div>
        </div>
    );
};


const VitalCard: React.FC<{
    title: string,
    records: VitalRecord[],
    dataKeys: { key: keyof VitalRecord, name: string, color: string }[],
    unit: string,
    zones?: { y1: number, y2: number, color: string }[],
    isGlowing?: boolean
}> = ({ title, records, dataKeys, unit, zones, isGlowing = false }) => {
    const data = useMemo(() => {
        return records.map(r => {
            const entry: any = { date: r.date };
            dataKeys.forEach(dk => {
                entry[dk.name] = r[dk.key] ? parseFloat(r[dk.key] as string) : null;
            });
            return entry;
        });
    }, [records, dataKeys]);

    const latestRecord = records.length > 0 ? records[records.length - 1] : null;
    const previousRecord = records.length > 1 ? records[records.length - 2] : null;

    const latestValues = dataKeys.map(dk => latestRecord?.[dk.key] || '–');
    
    const status = useMemo(() => {
        if (!latestRecord) return 'normal';
        const val1 = parseFloat(latestRecord[dataKeys[0].key] as string);
        const val2 = dataKeys[1] ? parseFloat(latestRecord[dataKeys[1].key] as string) : undefined;
        return getVitalStatus(title, val1, val2);
    }, [latestRecord, dataKeys, title]);
    
    const trend = useMemo(() => {
        if (!latestRecord || !previousRecord) return null;
        const key = dataKeys[0].key; // Trend based on primary key
        const latestVal = parseFloat(latestRecord[key] as string);
        const prevVal = parseFloat(previousRecord[key] as string);
        if (isNaN(latestVal) || isNaN(prevVal)) return null;
        const diff = latestVal - prevVal;
        if (Math.abs(diff) < 0.1) return { text: 'Stable', color: 'text-slate-500' };
        const Icon = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
        const color = diff > 0 ? 'text-red-500' : 'text-green-500';
        return { Icon, color, text: ` ${Math.abs(diff).toFixed(1)} ${unit}` };
    }, [latestRecord, previousRecord, dataKeys, unit]);


    return (
        <div className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md transition-all duration-500 ${isGlowing ? 'ring-2 ring-primary-light animate-pulse' : ''}`}>
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">{title}</h4>
                <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[status].color}`}>
                    {statusConfig[status].text}
                </div>
            </div>
            <div className="flex justify-between items-start my-1">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {latestValues.join('/')} <span className="text-sm font-normal text-slate-500">{unit}</span>
                </div>
                {trend && <div className={`flex items-center text-xs font-semibold ${trend.color}`}>{trend.Icon && <trend.Icon className="w-3 h-3"/>}{trend.text}</div>}
            </div>
            <p className="text-xs text-slate-500 mb-2">🕒 Updated: {latestRecord ? timeSince(new Date(latestRecord.date)) : 'N/A'}</p>
            <div className="h-32 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {dataKeys.map(dk => (
                                <linearGradient key={dk.name} id={`color-${dk.name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={dk.color} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={dk.color} stopOpacity={0}/>
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} fontSize={10} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} fontSize={10} unit={unit} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none', borderRadius: '0.5rem'}} labelStyle={{color: '#cbd5e1'}}/>
                        {zones?.map((zone, i) => <ReferenceArea key={i} y1={zone.y1} y2={zone.y2} stroke="none" fill={zone.color} fillOpacity={0.1} />)}
                        {dataKeys.map(dk => (
                             <React.Fragment key={dk.name}>
                                <Area type="monotone" dataKey={dk.name} stroke="transparent" fill={`url(#color-${dk.name.replace(/\s/g, '')})`} />
                                <Line type="monotone" dataKey={dk.name} stroke={dk.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                            </React.Fragment>
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const VitalsDashboard: React.FC = () => {
    const [records, setRecords] = useState<VitalRecord[]>([]);
    const [view, setView] = useState<'7D' | '30D' | 'ALL' | 'COMPARE'>('30D');
    const [aiSummary, setAiSummary] = useState<{observations: string[], recommendations: string[]} | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [error, setError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [recentlyUpdatedCard, setRecentlyUpdatedCard] = useState<string | null>(null);

    useEffect(() => {
        let savedRecords: VitalRecord[] = [];
        try {
            const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
            const parsed = rawData ? JSON.parse(rawData) : [];
            if (Array.isArray(parsed)) {
                savedRecords = parsed;
            }
        } catch (e) {
            console.error("Failed to parse vitals records:", e);
        }
        // FIX: Filter for valid records before sorting to prevent startup crash.
        const validRecords = savedRecords.filter(r => r && r.date);
        validRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setRecords(validRecords);
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleQuickSave = (data: Partial<VitalRecord>) => {
        if (Object.keys(data).length === 0) return;
        const newRecord: VitalRecord = {
            id: new Date().toISOString() + Math.random(),
            date: new Date().toISOString(),
            ...data
        };
        handleSaveRecord(newRecord);
        showToast('✅ Saved Successfully');
    };

    const handleSaveRecord = (record: VitalRecord) => {
        const newRecords = records.filter(r => r.id !== record.id);
        newRecords.push(record);
        newRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setRecords(newRecords);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRecords));
    };

    const handleDataSynced = (syncedData: Partial<VitalRecord>) => {
        const today = new Date().toISOString().split('T')[0];
        const existingTodayRecord = records.find(r => r.date.startsWith(today));
        
        const newRecord: VitalRecord = existingTodayRecord 
            ? { ...existingTodayRecord, ...syncedData, date: new Date().toISOString() }
            : { id: new Date().toISOString() + Math.random(), date: new Date().toISOString(), ...syncedData };
        
        handleSaveRecord(newRecord);
        
        let updatedCardTitle = '';
        if (syncedData.heartRate) updatedCardTitle = 'Heart Rate';
        else if (syncedData.temperature) updatedCardTitle = 'Temperature';
        else if (syncedData.sleepHours) updatedCardTitle = 'Sleep';
        else if (syncedData.steps) updatedCardTitle = 'Steps';
        else if (syncedData.activeCalories) updatedCardTitle = 'Active Calories';

        if (updatedCardTitle) {
            setRecentlyUpdatedCard(updatedCardTitle);
            setTimeout(() => setRecentlyUpdatedCard(null), 2000); // Glow for 2 seconds
        }
        showToast('Device data synced!');
    };

    
    const handleGenerateSummary = async () => {
        const filtered = filterRecordsByView(view, records);
        if (filtered.length < 2) {
            setError('Need at least two records in the selected period for trend analysis.');
            return;
        }
        setIsAiLoading(true);
        setError('');
        setAiSummary(null);
        try {
            const resultJson = await analyzeVitalsTrends(filtered);
            const parsed = JSON.parse(resultJson);
            if (parsed.error) setError(parsed.error);
            else setAiSummary(parsed);
        } catch(e) { setError('Failed to get AI summary.'); }
        setIsAiLoading(false);
    };

    const handleExportCSV = () => {
        if (records.length === 0) {
            showToast('No data to export.');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = Object.keys(records[0]).join(',');
        csvContent += headers + "\r\n";
        records.forEach(record => {
            const row = Object.values(record).map(val => `"${val || ''}"`).join(',');
            csvContent += row + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "vitals_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filterRecordsByView = (currentView: typeof view, allRecords: VitalRecord[]) => {
         if (currentView === 'ALL' || currentView === 'COMPARE') return allRecords;
        const now = new Date();
        const days = currentView === '7D' ? 7 : 30;
        const startDate = new Date(new Date().setDate(now.getDate() - days));
        return allRecords.filter(r => new Date(r.date) >= startDate);
    }
    
    const filteredRecords = useMemo(() => filterRecordsByView(view, records), [records, view]);
    
    const latestVitals = useMemo<Partial<VitalRecord>>(() => (records.length > 0 ? records[records.length - 1] : {}), [records]);
    const heartScore = useMemo(() => {
        const readiness = parseFloat(latestVitals.readinessScore || '0');
        const stress = parseFloat(latestVitals.stressLevel || '0');
        if (!latestVitals.readinessScore && !latestVitals.stressLevel) return null; // Don't show if no data
        return (readiness + (100 - stress)) / 2;
    }, [latestVitals]);

    const HeartScoreCard: React.FC<{ score: number | null }> = ({ score }) => {
        if (score === null) return null;
        const safeScore = isNaN(score) ? 0 : Math.round(Math.max(0, Math.min(100, score)));
        const color = safeScore > 75 ? '#22c55e' : safeScore > 50 ? '#f59e0b' : '#ef4444';
        return (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md flex flex-col items-center justify-center">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Heart Score</h4>
                <div className="w-full h-[148px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: safeScore, fill: color }]} startAngle={180} endAngle={-180}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={10} />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-current text-slate-900 dark:text-white">{safeScore}</text>
                        <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-current text-slate-500">Readiness</text>
                    </RadialBarChart>
                </ResponsiveContainer>
                </div>
            </div>
        );
    };


    return (
        <div className="space-y-6">
            {toastMessage && <div className="fixed top-20 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-up">{toastMessage}</div>}
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Vitals Dashboard</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg"><TableCellsIcon className="w-4 h-4"/>Export CSV</button>
                    <button onClick={() => alert('PDF Export coming soon!')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg"><ArrowUpTrayIcon className="w-4 h-4"/>Export PDF</button>
                    <button onClick={() => alert('Share feature coming soon!')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg"><ShareIcon className="w-4 h-4"/>Share</button>
                </div>
            </div>
            
            <QuickFillPanel onSave={handleQuickSave} />

            <BluetoothHealthSync onDataSynced={handleDataSynced} />
            
            <div className="flex gap-2 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                {(['COMPARE', '7D', '30D', 'ALL'] as const).map(p => (
                    <button key={p} onClick={() => setView(p)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === p ? 'bg-white dark:bg-slate-800 text-primary shadow' : 'text-slate-600 dark:text-slate-300'}`}>
                        {p === 'COMPARE' ? 'Compare Periods' : p === 'ALL' ? 'All Time' : `Last ${p}`}
                    </button>
                ))}
            </div>
            
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-3"><SparklesIcon className="w-8 h-8 text-primary"/><div><h3 className="text-lg font-bold">AI Analysis Summary</h3><p className="text-sm text-slate-500">Insights on your vitals trends.</p></div></div>
                    <button onClick={handleGenerateSummary} disabled={isAiLoading || records.length < 2} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary-light/20 text-primary-dark dark:text-primary-light font-semibold rounded-lg disabled:opacity-50"><SparklesIcon className={`w-5 h-5 ${isAiLoading ? 'animate-spin' : ''}`}/>{isAiLoading ? 'Analyzing...' : 'Regenerate Insights'}</button>
                </div>
                {error && <p className="mt-4 text-sm text-center text-red-500">{error}</p>}
                {aiSummary && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><h4 className="font-semibold mb-2">💡 Observations</h4><ul className="space-y-1 list-disc list-inside text-sm text-slate-600 dark:text-slate-300">{aiSummary.observations.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                        <div><h4 className="font-semibold mb-2">✅ Recommendations</h4><ul className="space-y-1 list-disc list-inside text-sm text-slate-600 dark:text-slate-300">{aiSummary.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <HeartScoreCard score={heartScore} />
                <VitalCard title="Blood Pressure" records={filteredRecords} dataKeys={[{key: 'bloodPressureSystolic', name: 'Systolic', color: '#3b82f6'}, {key: 'bloodPressureDiastolic', name: 'Diastolic', color: '#8b5cf6'}]} unit="mmHg" zones={[{y1:90, y2:120, color: '#22c55e'}, {y1:121, y2:139, color: '#f59e0b'}, {y1:140, y2:200, color: '#ef4444'}]}/>
                <VitalCard title="Blood Sugar" records={filteredRecords} dataKeys={[{key: 'bloodSugarFasting', name: 'Fasting', color: '#10b981'}]} unit="mg/dL" zones={[{y1:70, y2:99, color: '#22c55e'}, {y1:100, y2:125, color: '#f59e0b'}, {y1:126, y2:200, color: '#ef4444'}]}/>
                <VitalCard title="Heart Rate" records={filteredRecords} dataKeys={[{key: 'heartRate', name: 'Heart Rate', color: '#ec4899'}]} unit="bpm" isGlowing={recentlyUpdatedCard === 'Heart Rate'} zones={[{y1:60, y2:100, color: '#22c55e'}]}/>
                <VitalCard title="Sleep" records={filteredRecords} dataKeys={[{key: 'sleepHours', name: 'Sleep', color: '#6366f1'}]} unit="hrs" isGlowing={recentlyUpdatedCard === 'Sleep'}/>
                <VitalCard title="Steps" records={filteredRecords} dataKeys={[{key: 'steps', name: 'Steps', color: '#f97316'}]} unit="steps" isGlowing={recentlyUpdatedCard === 'Steps'}/>
                <VitalCard title="Active Calories" records={filteredRecords} dataKeys={[{key: 'activeCalories', name: 'Calories', color: '#ef4444'}]} unit="kcal" isGlowing={recentlyUpdatedCard === 'Active Calories'}/>
                <VitalCard title="Weight" records={filteredRecords} dataKeys={[{key: 'weightKg', name: 'Weight', color: '#0ea5e9'}]} unit="kg" />
                <VitalCard title="Oxygen Saturation" records={filteredRecords} dataKeys={[{key: 'oxygenSaturation', name: 'O₂ Sat.', color: '#8b5cf6'}]} unit="%" zones={[{y1:95, y2:100, color: '#22c55e'}, {y1:92, y2:94, color: '#f59e0b'}, {y1:80, y2:91, color: '#ef4444'}]}/>
                <VitalCard title="Temperature" records={filteredRecords} dataKeys={[{key: 'temperature', name: 'Temp', color: '#f59e0b'}]} unit="°C" isGlowing={recentlyUpdatedCard === 'Temperature'} zones={[{y1:36.1, y2:37.2, color: '#22c55e'}]}/>
            </div>
        </div>
    );
};

export default VitalsDashboard;