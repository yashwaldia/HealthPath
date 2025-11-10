import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile as UserProfileType, Child, Vaccination } from '../types';
import { ChildIcon, VaccineIcon, ChevronDownIcon, SaveIcon, SparklesIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';
import { VACCINATION_SCHEDULE } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyzeChildHealthData } from '../services/geminiService';

// --- HELPER & CONFIG ---

type VaccineStatus = 'Completed' | 'Upcoming' | 'Pending' | 'Missed';

const getAge = (dob: string): { years: number, months: number, totalMonths: number } => {
    if (!dob || typeof dob !== 'string') return { years: 0, months: 0, totalMonths: 0 };
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return { years: 0, months: 0, totalMonths: 0 };
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }
    const totalMonths = years * 12 + months;
    return { years, months, totalMonths };
};

const getAgeAtDate = (dob: string, atDateStr: string): { years: number, months: number, totalMonths: number } => {
    if (!dob || typeof dob !== 'string' || !atDateStr || typeof atDateStr !== 'string') return { years: 0, months: 0, totalMonths: 0 };
    const birthDate = new Date(dob);
    const atDate = new Date(atDateStr);
    if (isNaN(birthDate.getTime()) || isNaN(atDate.getTime())) return { years: 0, months: 0, totalMonths: 0 };
    
    let years = atDate.getFullYear() - birthDate.getFullYear();
    let months = atDate.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && atDate.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }
    const totalMonths = years * 12 + months;
    return { years, months, totalMonths };
};

// Simplified WHO growth chart data approximation for visualization purposes
const getGrowthReferenceData = (gender: 'Male' | 'Female', totalMonths: number) => {
    const getWeight = (p: number) => {
        const base = gender === 'Male' ? 3.3 : 3.2;
        const rate1 = gender === 'Male' ? 0.8 : 0.7;
        const rate2 = 0.5;
        const pFactor = p === 3 ? 0.85 : p === 50 ? 1 : 1.15;
        if (totalMonths <= 6) return (base + totalMonths * rate1) * pFactor;
        return (base + 6 * rate1 + (totalMonths - 6) * rate2) * pFactor;
    };
    const getHeight = (p: number) => {
        const base = gender === 'Male' ? 50 : 49;
        const rate1 = 2.5;
        const rate2 = 1.2;
        const pFactor = p === 3 ? 0.95 : p === 50 ? 1 : 1.05;
        if (totalMonths <= 12) return (base + totalMonths * rate1) * pFactor;
        return (base + 12 * rate1 + (totalMonths - 12) * rate2) * pFactor;
    };

    return [3, 50, 97].map(p => ({
        [`Weight_${p}`]: getWeight(p).toFixed(1),
        [`Height_${p}`]: getHeight(p).toFixed(1),
    })).reduce((acc, val) => ({...acc, ...val}), { ageMonths: totalMonths });
};

const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };
    let html = text
        .replace(/\*\*\*(.*?)\*\*\*/g, '<div class="p-3 my-2 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 rounded-r-lg text-sm"><strong>$1</strong></div>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\s*-\s(.*?)(?=\n\s*-|\n\n|$)/g, '<li class="ml-4 list-disc">$1</li>')
        .replace(/(\d\.\s)/g, '<br/><br/><strong>')
        .replace(/(<\/strong>)/g, '$1<br/>')
        .replace(/\n/g, '<br />');
    return { __html: html };
};

const getVaccineStatus = (vaccine: Vaccination, child: Child): { status: VaccineStatus, dueDate: Date | null } => {
    const birthDate = child.dob ? new Date(child.dob) : null;
    if (!birthDate || isNaN(birthDate.getTime())) {
        return { status: 'Upcoming', dueDate: null };
    }
    const dueDate = new Date(birthDate.getTime() + vaccine.ageInWeeks * 7 * 24 * 60 * 60 * 1000);
    const storedStatus = child.vaccinations ? child.vaccinations[vaccine.id] : undefined;
    
    if (storedStatus === 'Completed' || storedStatus === 'Missed') {
        return { status: storedStatus, dueDate };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);

    if (dueDate > today) {
        return { status: 'Upcoming', dueDate };
    }
    
    return { status: 'Pending', dueDate };
};

// --- SUB-COMPONENTS ---

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode, iconContainerClassName?: string }> = ({ icon, title, children, iconContainerClassName }) => (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="flex items-center mb-6">
            <div className={iconContainerClassName || "bg-primary-light/20 text-primary-dark dark:text-primary-light p-3 rounded-full"}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white ml-4">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        {children}
    </div>
);

const VaccinationTracker: React.FC<{ child: Child; onUpdate: (child: Child) => void; }> = ({ child, onUpdate }) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const handleStatusUpdate = (vaccineId: string, status: 'Completed' | 'Missed' | null) => {
        const updatedVaccinations = { ...(child.vaccinations || {}) };
        if (status) {
            updatedVaccinations[vaccineId] = status;
        } else {
            delete updatedVaccinations[vaccineId];
        }
        onUpdate({ ...child, vaccinations: updatedVaccinations });
        setOpenMenu(null);
    };

    const statusConfig: Record<VaccineStatus, { color: string, icon?: React.ReactNode }> = {
        Completed: { color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300', icon: <CheckCircleIcon className="w-4 h-4" /> },
        Upcoming: { color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
        Pending: { color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
        Missed: { color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300', icon: <AlertTriangleIcon className="w-4 h-4" /> },
    };
    
    return (
        <div>
            <h5 className="font-semibold mb-2">💉 Vaccinations</h5>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500">
                        <tr><th className="p-2">Vaccine</th><th className="p-2">Due Age</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr>
                    </thead>
                    <tbody>
                        {VACCINATION_SCHEDULE.map(vaccine => {
                            const { status } = getVaccineStatus(vaccine, child);
                            return (
                                <tr key={vaccine.id} className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="p-2 font-medium">{vaccine.name}</td>
                                    <td className="p-2 text-slate-600 dark:text-slate-300">{vaccine.ageDescription}</td>
                                    <td className="p-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${statusConfig[status].color}`}>
                                            {statusConfig[status].icon} {status}
                                        </span>
                                    </td>
                                    <td className="p-2 relative">
                                        <button onClick={() => setOpenMenu(openMenu === vaccine.id ? null : vaccine.id)} className="font-semibold text-primary">Update</button>
                                        {openMenu === vaccine.id && (
                                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-10">
                                                <button onClick={() => handleStatusUpdate(vaccine.id, 'Completed')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Mark Completed</button>
                                                <button onClick={() => handleStatusUpdate(vaccine.id, 'Missed')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Mark Missed</button>
                                                <button onClick={() => handleStatusUpdate(vaccine.id, null)} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Reset Status</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ChildProfileCard: React.FC<{
    child: Child;
    aiAnalysis: { loading: boolean, analysis: string | null };
    onUpdate: (updatedChild: Child) => void;
    onDelete: (childId: string) => void;
    onAnalyze: (childId: string) => void;
}> = ({ child, aiAnalysis, onUpdate, onDelete, onAnalyze }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [newGrowthRecord, setNewGrowthRecord] = useState({ heightCm: '', weightKg: '' });

    const { years, months } = getAge(child.dob);
    const ageString = `${years} years, ${months} months`;

    const handleGrowthRecordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewGrowthRecord({ ...newGrowthRecord, [e.target.name]: e.target.value });
    };

    const addGrowthRecord = () => {
        if (newGrowthRecord.heightCm && newGrowthRecord.weightKg) {
            const updatedChild = {
                ...child,
                growthRecords: [
                    ...(child.growthRecords || []),
                    { date: new Date().toISOString(), ...newGrowthRecord }
                ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            };
            onUpdate(updatedChild);
            setNewGrowthRecord({ heightCm: '', weightKg: '' });
        }
    };
    
    const growthChartData = useMemo(() => {
        if (!child.dob || isNaN(new Date(child.dob).getTime())) return [];
        
        return (child.growthRecords || [])
            .filter(Boolean) // Filter out null/undefined records
            .map(r => {
                if (!r.date) return null;
                const recordDate = new Date(r.date);
                if (isNaN(recordDate.getTime())) return null; 
                
                const ageAtRecord = getAgeAtDate(child.dob, r.date);
                if (ageAtRecord.totalMonths < 0) return null; // Don't plot records from before DOB

                const refData = getGrowthReferenceData(child.gender, ageAtRecord.totalMonths);
                return {
                    date: recordDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    ageInMonths: ageAtRecord.totalMonths,
                    Height: r.heightCm ? parseFloat(r.heightCm) : null,
                    Weight: r.weightKg ? parseFloat(r.weightKg) : null,
                    ...refData,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.ageInMonths - b.ageInMonths);
    }, [child.growthRecords, child.dob, child.gender]);
    
    const latestBmi = useMemo(() => {
        if (!child.growthRecords) return null;
        const latestRecord = [...child.growthRecords].filter(Boolean).reverse().find(r => r.heightCm && r.weightKg);
        if (latestRecord) {
            const heightM = parseFloat(latestRecord.heightCm) / 100;
            const weight = parseFloat(latestRecord.weightKg);
            if(heightM > 0 && weight > 0) {
                const bmiVal = weight / (heightM * heightM);
                let category = 'Healthy';
                // Note: BMI categories for children are based on percentiles, this is a simplification.
                if(bmiVal < 15) category = 'Underweight'; // Example threshold
                if(bmiVal > 22) category = 'Overweight'; // Example threshold
                return { value: bmiVal.toFixed(1), category };
            }
        }
        return null;
    }, [child.growthRecords]);

    return (
        <div className="bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center text-left">
                <div>
                    <h4 className="font-bold text-lg">{child.name}</h4>
                    <p className="text-sm text-slate-500">{ageString} &nbsp;&bull;&nbsp; Birth Wt: {child.birthWeightKg || 'N/A'} kg</p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700 space-y-6">
                     <div>
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-semibold">📈 Growth Chart</h5>
                            {latestBmi && <div className="text-xs text-right"><span className="font-semibold">Latest BMI:</span> {latestBmi.value} ({latestBmi.category})</div>}
                        </div>
                         {growthChartData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={growthChartData}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                        <XAxis dataKey="date" fontSize={10}/>
                                        <YAxis yAxisId="left" name="Height" unit="cm" stroke="#3b82f6" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']}/>
                                        <YAxis yAxisId="right" name="Weight" unit="kg" orientation="right" stroke="#ef4444" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']}/>
                                        <Tooltip contentStyle={{backgroundColor: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: '0.5rem'}}/>
                                        <Legend wrapperStyle={{fontSize: '12px'}}/>
                                        <Line yAxisId="left" type="monotone" dataKey="Height_50" name="50th %tile Ht" stroke="#a7c7f0" strokeDasharray="5 5" dot={false} activeDot={false}/>
                                        <Line yAxisId="right" type="monotone" dataKey="Weight_50" name="50th %tile Wt" stroke="#f7baba" strokeDasharray="5 5" dot={false} activeDot={false}/>
                                        <Line yAxisId="left" type="monotone" dataKey="Height" stroke="#3b82f6" strokeWidth={2} dot={{r:4}} connectNulls/>
                                        <Line yAxisId="right" type="monotone" dataKey="Weight" stroke="#ef4444" strokeWidth={2} dot={{r:4}} connectNulls/>
                                    </LineChart>
                                </ResponsiveContainer>
                           </div>
                        ) : <p className="text-center text-xs text-slate-500 py-8">Add growth records to see the chart.</p>}
                    </div>

                    <div>
                        <h5 className="font-semibold mb-2">Add Growth Record</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                           <input type="number" name="heightCm" value={newGrowthRecord.heightCm} onChange={handleGrowthRecordChange} placeholder="Height (cm)" className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                           <input type="number" name="weightKg" value={newGrowthRecord.weightKg} onChange={handleGrowthRecordChange} placeholder="Weight (kg)" className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                           <button onClick={addGrowthRecord} className="w-full text-sm px-4 py-2 bg-secondary text-white font-semibold rounded-lg">Add Record</button>
                        </div>
                    </div>
                    
                    <VaccinationTracker child={child} onUpdate={onUpdate} />
                    
                    <div>
                        <h5 className="font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-primary"/>🧠 AI Summary</h5>
                        <p className="text-xs text-slate-500 mb-2">Get an educational analysis of {child.name}'s growth and vaccination status. Reminders for upcoming vaccines are enabled by default and will appear in your main notification panel.</p>
                        <button onClick={() => onAnalyze(child.id)} disabled={aiAnalysis?.loading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-light/20 text-primary-dark dark:text-primary-light font-semibold rounded-lg disabled:opacity-50">
                            <SparklesIcon className={`w-5 h-5 ${aiAnalysis?.loading ? 'animate-spin' : ''}`}/>
                            {aiAnalysis?.loading ? 'Analyzing...' : `Analyze ${child.name}'s Health`}
                        </button>
                        {aiAnalysis?.analysis && (
                             <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg text-sm" dangerouslySetInnerHTML={renderMarkdown(aiAnalysis.analysis)} />
                        )}
                    </div>

                     <button onClick={() => onDelete(child.id)} className="text-xs text-red-500 hover:underline">Remove {child.name}</button>
                </div>
            )}
        </div>
    );
};

const ChildHealth: React.FC = () => {
    const [profile, setProfile] = useState<UserProfileType>({ children: [] });
    const [isSaved, setIsSaved] = useState(false);
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChild, setNewChild] = useState<Omit<Child, 'id' | 'vaccinations' | 'growthRecords'>>({ name: '', dob: '', gender: 'Female', birthWeightKg: '' });
    const [aiAnalyses, setAiAnalyses] = useState<Record<string, { loading: boolean, analysis: string | null }>>({});

    const loadProfile = () => {
        const savedProfile = localStorage.getItem('healthpath_user_profile');
        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile);
                if (parsed.children && Array.isArray(parsed.children)) {
                    // FIX: Strengthen filter to prevent crashes from corrupted data.
                    parsed.children = parsed.children.filter((child: any) => child && typeof child === 'object' && child.id);
                }
                setProfile(parsed);
            } catch (e) {
                console.error("Failed to parse user profile from localStorage", e);
                setProfile({ children: [] }); // Reset to default if parsing fails
            }
        } else {
            setProfile({ children: [] });
        }
    };

    useEffect(() => {
        loadProfile();
        window.addEventListener('reportsUpdated', loadProfile);
        return () => window.removeEventListener('reportsUpdated', loadProfile);
    }, []);
    
    const handleAnalyzeChild = async (childId: string) => {
        const childToAnalyze = profile.children?.find(c => c.id === childId);
        if (!childToAnalyze) return;

        setAiAnalyses(prev => ({ ...prev, [childId]: { loading: true, analysis: null } }));

        try {
            const analysisResult = await analyzeChildHealthData(childToAnalyze);
            setAiAnalyses(prev => ({ ...prev, [childId]: { loading: false, analysis: analysisResult } }));
        } catch (error) {
            console.error("AI analysis failed", error);
            setAiAnalyses(prev => ({ ...prev, [childId]: { loading: false, analysis: "Error generating analysis." } }));
        }
    };

    const handleSave = () => {
        const existingProfile = JSON.parse(localStorage.getItem('healthpath_user_profile') || '{}');
        const updatedProfile = { ...existingProfile, children: profile.children };
        localStorage.setItem('healthpath_user_profile', JSON.stringify(updatedProfile));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        window.dispatchEvent(new Event('reportsUpdated'));
    };

    const handleNewChildChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewChild({ ...newChild, [e.target.name]: e.target.value });
    };

    const handleAddChild = () => {
        if (newChild.name && newChild.dob) {
            const childToAdd: Child = {
                id: new Date().toISOString() + Math.random(),
                ...newChild,
                vaccinations: {},
                growthRecords: [],
            };
            if (newChild.birthWeightKg) {
                const dobDate = new Date(newChild.dob);
                if (!isNaN(dobDate.getTime())) {
                    childToAdd.growthRecords.push({
                        date: dobDate.toISOString(),
                        heightCm: '', // Height at birth is often not recorded in this format
                        weightKg: newChild.birthWeightKg,
                    });
                }
            }
            setProfile(prev => ({
                ...prev,
                children: [...(prev.children || []), childToAdd]
            }));
            setNewChild({ name: '', dob: '', gender: 'Female', birthWeightKg: '' });
            setIsAddingChild(false);
        }
    };

    const handleUpdateChild = (updatedChild: Child) => {
        setProfile(prev => ({
            ...prev,
            children: (prev.children || []).map(c => c.id === updatedChild.id ? updatedChild : c)
        }));
    };

    const handleDeleteChild = (childId: string) => {
        setProfile(prev => ({
            ...prev,
            children: (prev.children || []).filter(c => c.id !== childId)
        }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Child Health & Growth Tracking</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your children's health records, vaccinations, and growth milestones.</p>
            </div>

            <SectionCard
                icon={<ChildIcon className="w-6 h-6" />}
                title="Your Children"
                iconContainerClassName="p-3 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-500 dark:text-teal-400"
            >
                <div className="space-y-4">
                    {(profile.children || []).length > 0 ? (
                        (profile.children || []).map(child => (
                            <ChildProfileCard
                                key={child.id}
                                child={child}
                                aiAnalysis={aiAnalyses[child.id] || { loading: false, analysis: null }}
                                onUpdate={handleUpdateChild}
                                onDelete={handleDeleteChild}
                                onAnalyze={handleAnalyzeChild}
                            />
                        ))
                    ) : (
                       !isAddingChild && <p className="text-center text-slate-500 py-4">No children added yet. Click below to add a child's profile.</p>
                    )}
                    
                    {!isAddingChild && (
                        <button onClick={() => setIsAddingChild(true)} className="w-full text-sm font-semibold text-primary dark:text-primary-light p-2 rounded-lg border-2 border-dashed border-primary-light/50 hover:bg-primary-light/10">
                            + Add Child / Kid
                        </button>
                    )}
                    {isAddingChild && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-4">
                            <h4 className="font-semibold">Add New Child Profile</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Child's Name"><input type="text" name="name" value={newChild.name} onChange={handleNewChildChange} className="w-full p-2 text-sm border-slate-300 dark:border-slate-600 rounded-lg"/></FormField>
                                <FormField label="Date of Birth"><input type="date" name="dob" value={newChild.dob} onChange={handleNewChildChange} className="w-full p-2 text-sm border-slate-300 dark:border-slate-600 rounded-lg"/></FormField>
                                <FormField label="Gender"><select name="gender" value={newChild.gender} onChange={handleNewChildChange} className="w-full p-2 text-sm border-slate-300 dark:border-slate-600 rounded-lg"><option>Female</option><option>Male</option></select></FormField>
                                <FormField label="Birth Weight (kg)"><input type="number" name="birthWeightKg" value={newChild.birthWeightKg} onChange={handleNewChildChange} className="w-full p-2 text-sm border-slate-300 dark:border-slate-600 rounded-lg"/></FormField>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleAddChild} className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg">Save Child</button>
                                <button onClick={() => setIsAddingChild(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            <div className="flex items-center justify-end gap-4 mt-8 sticky bottom-4">
                {isSaved && <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in bg-green-100 dark:bg-green-900/50 px-4 py-2 rounded-lg">Child data saved successfully!</p>}
                <button
                    onClick={handleSave}
                    className="inline-flex items-center justify-center px-8 py-3 bg-secondary hover:bg-secondary-dark text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                >
                    <SaveIcon className="w-5 h-5 mr-2"/>
                    Save All Changes
                </button>
            </div>
            
             <p className="text-center text-xs text-slate-500 mt-6 pb-4">
                Disclaimer: Growth charts are illustrative. Always consult a pediatrician for health advice.
            </p>
        </div>
    );
};

export default ChildHealth;