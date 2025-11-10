import React, { useState, useEffect, useMemo } from 'react';
// FIX: Add VitalRecord to imports to support loading and passing vitals data.
import { UserProfile, Report, RadiologyReport, VitalRecord } from '../types';
import { generateAiHealthReportSummary } from '../services/geminiService';
import { SparklesIcon, UserIcon, HeartPulseIcon, ClipboardListIcon, ArrowDownIcon, ArrowUpIcon, FlowerIcon, ChildIcon, ScanIcon } from './Icons';

interface AiReportData {
    aiSummary: string[];
    femaleHealthSummary: string[];
    childHealthSummaries?: {
        childName: string;
        summary: string[];
    }[];
    healthReportInsights: string[];
    radiologySummary?: string[];
    aiObservations: string[];
    historicalComparison: {
        metric: string;
        change: string;
        status: 'Improved' | 'Worsened' | 'Stable';
    }[];
}

const AiHealthReport: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [latestReport, setLatestReport] = useState<Report | null>(null);
    const [previousReport, setPreviousReport] = useState<Report | null>(null);
    const [latestRadiologyReport, setLatestRadiologyReport] = useState<RadiologyReport | null>(null);
    // FIX: Add state to hold vitals records, which are a required input for the AI summary.
    const [vitals, setVitals] = useState<VitalRecord[]>([]);
    const [aiReport, setAiReport] = useState<AiReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = () => {
            try {
                const savedProfile = localStorage.getItem('healthpath_user_profile');
                if (savedProfile) {
                    const parsed = JSON.parse(savedProfile);
                    if (typeof parsed === 'object' && parsed !== null) {
                        setProfile(parsed);
                    }
                }
            } catch (e) { console.error("Failed to parse profile", e); }
    
            try {
                const rawReports = localStorage.getItem('healthpath_lab_reports');
                const savedReports: Report[] = rawReports ? JSON.parse(rawReports) : [];
                // FIX: Filter for valid reports before sorting to prevent startup crash from corrupted data.
                if (Array.isArray(savedReports)) {
                    const validReports = savedReports.filter(r => r && r.date);
                    validReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    if (validReports.length > 0) setLatestReport(validReports[0]);
                    if (validReports.length > 1) setPreviousReport(validReports[1]);
                }
            } catch (e) { console.error("Failed to parse lab reports", e); }
    
            try {
                const rawRadiology = localStorage.getItem('healthpath_radiology_reports');
                const savedRadiologyReports: RadiologyReport[] = rawRadiology ? JSON.parse(rawRadiology) : [];
                // FIX: Filter for valid reports before sorting to prevent startup crash.
                if (Array.isArray(savedRadiologyReports)) {
                    const validRadiologyReports = savedRadiologyReports.filter(r => r && r.date);
                    validRadiologyReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    if (validRadiologyReports.length > 0) {
                        setLatestRadiologyReport(validRadiologyReports[0]);
                    }
                }
            } catch (e) { console.error("Failed to parse radiology reports", e); }
            
            try {
                const rawVitals = localStorage.getItem('healthpath_vitals_records');
                const savedVitals: VitalRecord[] = rawVitals ? JSON.parse(rawVitals) : [];
                if(Array.isArray(savedVitals)) {
                    setVitals(savedVitals);
                }
            } catch(e) { console.error("Failed to parse vitals", e); }
        };
        loadData();
    }, []);
    
    const calculatedMetrics = useMemo(() => {
        if (!profile) return null;
        const weight = parseFloat(profile.weight || '0');
        const height = parseFloat(profile.height || '0');
        const age = profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : parseFloat(profile.age || '0');
        
        let bmi = 'N/A', bmiCategory = 'N/A';
        if (weight > 0 && height > 0) {
            const heightM = height / 100;
            const bmiVal = weight / (heightM * heightM);
            bmi = bmiVal.toFixed(1);
            if (bmiVal < 18.5) bmiCategory = 'Underweight';
            else if (bmiVal < 25) bmiCategory = 'Normal';
            else if (bmiVal < 30) bmiCategory = 'Overweight';
            else bmiCategory = 'Obese';
        }

        let bmr = 'N/A';
        if (weight > 0 && height > 0 && age > 0 && profile.gender) {
             if (profile.gender === 'Male') {
                bmr = (10 * weight + 6.25 * height - 5 * age + 5).toFixed(0);
            } else if (profile.gender === 'Female') {
                bmr = (10 * weight + 6.25 * height - 5 * age - 161).toFixed(0);
            }
        }

        let tdee = 'N/A';
        if (bmr !== 'N/A' && profile.physicalActivity) {
            const activityMultipliers = { 'Sedentary': 1.2, 'Moderate': 1.55, 'Active': 1.725 };
            const multiplier = activityMultipliers[profile.physicalActivity] || 1.2;
            tdee = (parseFloat(bmr) * multiplier).toFixed(0);
        }

        let waterIntake = 'N/A';
        if (weight > 0) {
            waterIntake = (weight * 0.033).toFixed(1);
        }

        return { bmi, bmiCategory, bmr, tdee, waterIntake };
    }, [profile]);


    const handleGenerateReport = async () => {
        if (!profile || !latestReport) {
            setError('User Profile and at least one Lab Report are required to generate a summary.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAiReport(null);
        try {
            // FIX: Pass vitals data as the 5th argument to the function call, which was missing.
            const resultJson = await generateAiHealthReportSummary(profile, latestReport, previousReport, latestRadiologyReport, vitals);
            const parsedResult = JSON.parse(resultJson);
            if (parsedResult.error) {
                setError(parsedResult.error);
            } else {
                setAiReport(parsedResult);
            }
        } catch (e) {
            console.error(e);
            setError('Failed to parse the AI response. Please try again.');
        }
        setIsLoading(false);
    };

    const renderMetricCard = (title: string, value: string | undefined | null, unit: string, subtitle?: string) => (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-center">
            <p className="text-xs text-slate-500">{title}</p>
            <p className="text-xl font-bold text-primary dark:text-primary-light">{value || 'N/A'}{unit}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
    );
    
    const renderInsightList = (title: string, items: string[], icon: React.ReactNode, iconContainerClassName?: string) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center mb-4">
                <div className={iconContainerClassName || "bg-primary-light/20 text-primary-dark dark:text-primary-light p-2 rounded-full"}>{icon}</div>
                <h3 className="text-lg font-bold ml-3">{title}</h3>
            </div>
            <ul className="space-y-2 list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                {(items || []).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    );

    if (!profile || !latestReport) {
        return (
            <div className="text-center py-16 max-w-2xl mx-auto">
                 <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Generate Your AI Health Report</h2>
                 <p className="text-slate-500 mt-2 mb-6">To get a comprehensive AI-powered summary, please make sure you have:</p>
                 <ul className="text-left list-disc list-inside bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-2">
                     <li className={profile ? 'text-green-600 line-through' : ''}>A completed User Profile.</li>
                     <li className={latestReport ? 'text-green-600 line-through' : ''}>At least one saved Lab Report.</li>
                 </ul>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold">AI-Powered Health Report</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">A unified dashboard of your health profile, metrics, and AI insights.</p>
            </div>

            {!aiReport && !isLoading && (
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center">
                    <h3 className="text-xl font-bold">Your Report is Ready to Generate</h3>
                    <p className="text-slate-500 my-4">Click the button below to have our AI analyze your profile and latest lab reports to create a personalized health summary.</p>
                    <button onClick={handleGenerateReport} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105">
                        <SparklesIcon className="w-6 h-6"/>
                        Generate AI Health Report
                    </button>
                </div>
            )}
            
            {isLoading && (
                 <div className="text-center p-8">
                    <svg className="animate-spin mx-auto h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-4 text-slate-500 font-semibold">AI is analyzing your health data... this may take a moment.</p>
                </div>
            )}

            {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">{error}</p>}

            {aiReport && (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Basic Info & FitCalc Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <div className="flex items-center mb-4"><div className="bg-primary-light/20 text-primary-dark dark:text-primary-light p-2 rounded-full"><UserIcon className="w-5 h-5"/></div><h3 className="text-lg font-bold ml-3">Basic Information</h3></div>
                            <div className="text-sm space-y-2">
                                <p><strong>Name:</strong> {profile?.fullName}</p>
                                <p><strong>Age:</strong> {profile?.age || (profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 'N/A')} | <strong>Gender:</strong> {profile?.gender}</p>
                                <p><strong>Conditions:</strong> {profile?.conditions || 'None reported'}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <div className="flex items-center mb-4"><div className="bg-primary-light/20 text-primary-dark dark:text-primary-light p-2 rounded-full"><HeartPulseIcon className="w-5 h-5"/></div><h3 className="text-lg font-bold ml-3">Activity & FitCalc Overview</h3></div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                               {renderMetricCard('BMI', calculatedMetrics?.bmi, '', calculatedMetrics?.bmiCategory)}
                               {renderMetricCard('BMR', calculatedMetrics?.bmr, ' kcal', 'at rest')}
                               {renderMetricCard('TDEE', calculatedMetrics?.tdee, ' kcal', profile?.physicalActivity)}
                               {renderMetricCard('Water', calculatedMetrics?.waterIntake, ' L', 'daily rec.')}
                            </div>
                        </div>
                    </div>
                    
                    {/* AI Summary */}
                    {renderInsightList("AI Summary", aiReport.aiSummary, <SparklesIcon className="w-5 h-5"/>)}

                    {/* Health Report Insights */}
                    {renderInsightList("Health Report Insights", aiReport.healthReportInsights, <ClipboardListIcon className="w-5 h-5"/>)}
                    
                    {/* Radiology Summary */}
                    {aiReport.radiologySummary && aiReport.radiologySummary.length > 0 &&
                        renderInsightList(
                            "Latest Radiology Insights",
                            aiReport.radiologySummary,
                            <ScanIcon className="w-5 h-5"/>,
                            "p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                        )
                    }

                    {/* Female Health Summary */}
                    {aiReport.femaleHealthSummary && aiReport.femaleHealthSummary.length > 0 &&
                        renderInsightList(
                            "Female Health Summary",
                            aiReport.femaleHealthSummary,
                            <FlowerIcon className="w-5 h-5"/>,
                            "p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500 dark:text-pink-400"
                        )
                    }

                    {/* Child Health Summaries */}
                    {aiReport.childHealthSummaries && aiReport.childHealthSummaries.length > 0 && (
                        aiReport.childHealthSummaries.map((childSummary, index) => (
                           renderInsightList(
                               `Child Health Summary: ${childSummary.childName}`,
                               childSummary.summary,
                               <ChildIcon className="w-5 h-5"/>,
                               "p-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-500 dark:text-teal-400"
                           )
                        ))
                    )}

                    {/* AI Observations & Suggestions */}
                    {renderInsightList("AI Observation & Suggestions", aiReport.aiObservations, <SparklesIcon className="w-5 h-5"/>)}

                    {/* Historical Comparison */}
                    {aiReport.historicalComparison && aiReport.historicalComparison.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <div className="flex items-center mb-4"><h3 className="text-lg font-bold">Historical Comparison</h3></div>
                            <div className="space-y-3">
                                {aiReport.historicalComparison.map((item, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-4 items-center border-b border-slate-200 dark:border-slate-700 pb-2 last:border-none">
                                        <p className="font-semibold text-sm">{item.metric}</p>
                                        <p className="text-center font-medium text-sm">{item.change}</p>

                                        <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${item.status === 'Improved' ? 'text-green-500' : item.status === 'Worsened' ? 'text-red-500' : 'text-slate-500'}`}>
                                           {item.status === 'Improved' ? <ArrowDownIcon className="w-4 h-4"/> : item.status === 'Worsened' ? <ArrowUpIcon className="w-4 h-4"/> : null}
                                           {item.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
        </div>
    );
};

export default AiHealthReport;