import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { UserIcon, SaveIcon, ClipboardListIcon, HeartPulseIcon, SparklesIcon, UploadIcon, TrashIcon, FlowerIcon } from './Icons';
import { interpretLabResultsForProfile } from '../services/geminiService';
import { PATHOLOGY_TESTS } from '../constants';


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

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string; helperText?: string }> = ({ label, children, className, helperText }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        {children}
        {helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
);

const UserProfile: React.FC = () => {
    const [profile, setProfile] = useState<UserProfileType>({
        fullName: '',
        dob: '',
        age: '',
        gender: 'Prefer not to say',
        height: '',
        weight: '',
        bloodGroup: 'Unknown',
        allergies: '',
        conditions: '',
        medications: '',
        surgeryHistory: '',
        familyHistory: '',
        dietType: 'Other',
        waterIntake: '',
        sleepDuration: '',
        smokingHabit: 'Never',
        alcoholConsumption: 'None',
        physicalActivity: 'Sedentary',
        exerciseRoutine: '',
        vitalsReminderTime: '',
        lastMenstrualPeriod: '',
        cycleLength: '28',
        isPregnant: 'Unknown',
        children: [],
    });
    const [isSaved, setIsSaved] = useState(false);

    // State for AI Interpreter feature
    const [interpretation, setInterpretation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [labResultText, setLabResultText] = useState('');
    const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload');

    useEffect(() => {
        try {
            const savedProfile = localStorage.getItem('healthpath_user_profile');
            if (savedProfile) {
                const parsedProfile = JSON.parse(savedProfile);
                if (typeof parsedProfile === 'object' && parsedProfile !== null) {
                    // Ensure children is an array to prevent crashes
                    if (!Array.isArray(parsedProfile.children)) {
                        parsedProfile.children = [];
                    }
                    setProfile(parsedProfile);
                }
            }
        } catch (e) {
            console.error("Failed to parse user profile from localStorage", e);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
        setIsSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('healthpath_user_profile', JSON.stringify(profile));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        // Dispatch an event that other components can listen to, to reload profile data.
        window.dispatchEvent(new Event('reportsUpdated'));
    };
    
    const bmi = useMemo(() => {
        const height = parseFloat(profile.height || '0');
        const weight = parseFloat(profile.weight || '0');
        if (height > 0 && weight > 0) {
            const heightInMeters = height / 100;
            const bmiValue = weight / (heightInMeters * heightInMeters);
            let category = '';
            let color = '';
            if (bmiValue < 18.5) { category = 'Underweight'; color = 'text-blue-500'; }
            else if (bmiValue < 25) { category = 'Normal weight'; color = 'text-green-500'; }
            else if (bmiValue < 30) { category = 'Overweight'; color = 'text-yellow-500'; }
            else { category = 'Obesity'; color = 'text-red-500'; }
            return { value: bmiValue.toFixed(1), category, color };
        }
        return { value: 'N/A', category: 'Enter height & weight', color: 'text-slate-500' };
    }, [profile.height, profile.weight]);

    const femaleHealthMetrics = useMemo(() => {
        const lmp = profile.lastMenstrualPeriod;
        const cycle = parseInt(profile.cycleLength || '28', 10);
        
        const emptyMetrics = { nextPeriod: 'N/A', fertileWindow: 'N/A', edd: 'N/A', gestation: 'N/A', trimester: 'N/A' };
        if (!lmp || isNaN(cycle) || !/^\d{4}-\d{2}-\d{2}$/.test(lmp)) {
            return emptyMetrics;
        }

        const [year, month, day] = lmp.split('-').map(Number);
        const lmpDate = new Date(year, month - 1, day);
        if (isNaN(lmpDate.getTime())) return emptyMetrics;

        // Menstrual calculations
        const nextPeriodDate = new Date(lmpDate);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + cycle);
        const nextPeriod = nextPeriodDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const ovulationDayOffset = cycle - 14;
        const fertileStart = new Date(lmpDate);
        fertileStart.setDate(lmpDate.getDate() + ovulationDayOffset - 4);
        const fertileEnd = new Date(lmpDate);
        fertileEnd.setDate(lmpDate.getDate() + ovulationDayOffset + 1);
        const fertileWindow = `${fertileStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${fertileEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        // Pregnancy calculations
        let edd = 'N/A', gestation = 'N/A', trimester = 'N/A';
        if (profile.isPregnant === 'Yes') {
            const eddDate = new Date(lmpDate);
            eddDate.setDate(eddDate.getDate() + 280);
            edd = eddDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const today = new Date();
            const gestationDays = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
            const gestationWeeks = Math.floor(gestationDays / 7);
            const gestationRemainderDays = gestationDays % 7;
            if (gestationWeeks >= 0) {
              gestation = `${gestationWeeks} weeks, ${gestationRemainderDays} days`;
              if (gestationWeeks <= 13) trimester = '1st';
              else if (gestationWeeks <= 27) trimester = '2nd';
              else trimester = '3rd';
            }
        }

        return { nextPeriod, fertileWindow, edd, gestation, trimester };
    }, [profile.lastMenstrualPeriod, profile.cycleLength, profile.isPregnant]);

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
        }
    };
    
    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleGetInterpretation = async () => {
        const input: { text?: string; files?: File[] } = {};
        
        if (inputMode === 'upload' && files.length > 0) {
            input.files = files;
        } else if (inputMode === 'manual' && labResultText.trim()) {
            input.text = labResultText;
        } else {
            setError('Please upload files or paste text to get an interpretation.');
            return;
        }

        setError('');
        setIsLoading(true);
        setInterpretation('');
        try {
            const result = await interpretLabResultsForProfile(input, profile, PATHOLOGY_TESTS);
            setInterpretation(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
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


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Comprehensive Health Profile</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">A complete profile helps in providing personalized health insights.</p>
            </div>

            <div className="space-y-8">
                <SectionCard icon={<UserIcon className="w-6 h-6" />} title="Basic Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField label="Full Name" className="sm:col-span-2">
                            <input type="text" name="fullName" value={profile.fullName} onChange={handleChange} placeholder="e.g., Arjun Reddy" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Date of Birth" helperText="Use the date picker for correct formatting.">
                            <input type="date" name="dob" value={profile.dob} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Gender">
                            <select name="gender" value={profile.gender} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                                <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                            </select>
                        </FormField>
                        <FormField label="Height (cm)" helperText="Enter your height in centimeters.">
                            <input type="number" name="height" value={profile.height} onChange={handleChange} placeholder="e.g., 172" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Weight (kg)" helperText="Enter your weight in kilograms.">
                            <input type="number" name="weight" value={profile.weight} onChange={handleChange} placeholder="e.g., 68" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
                            <span className="font-medium">BMI (Auto-Calculated)</span>
                            <div className="text-right">
                               <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{bmi.value}</span>
                               <p className={`text-sm font-semibold ${bmi.color}`}>{bmi.category}</p>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={<ClipboardListIcon className="w-6 h-6" />} title="Medical Background">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField label="Blood Group">
                            <select name="bloodGroup" value={profile.bloodGroup} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                               {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => <option key={bg}>{bg}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Allergies">
                            <input type="text" name="allergies" value={profile.allergies} onChange={handleChange} placeholder="e.g., Penicillin, Dust" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Pre-existing Conditions" className="sm:col-span-2">
                            <textarea name="conditions" value={profile.conditions} onChange={handleChange} rows={2} placeholder="e.g., Type 2 Diabetes, Hypertension" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Current Medications" className="sm:col-span-2">
                             <textarea name="medications" value={profile.medications} onChange={handleChange} rows={2} placeholder="e.g., Metformin 500mg" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Surgery History" className="sm:col-span-2">
                             <input type="text" name="surgeryHistory" value={profile.surgeryHistory} onChange={handleChange} placeholder="e.g., Appendectomy (2019)" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                         <FormField label="Family Medical History" className="sm:col-span-2">
                             <input type="text" name="familyHistory" value={profile.familyHistory} onChange={handleChange} placeholder="e.g., Heart Disease, Diabetes" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                    </div>
                </SectionCard>

                <SectionCard icon={<HeartPulseIcon className="w-6 h-6" />} title="Lifestyle & Habits">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField label="Diet Type">
                            <select name="dietType" value={profile.dietType} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                               {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Keto', 'Other'].map(d => <option key={d}>{d}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Physical Activity">
                            <select name="physicalActivity" value={profile.physicalActivity} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                               {['Sedentary', 'Moderate', 'Active'].map(pa => <option key={pa}>{pa}</option>)}
                            </select>
                        </FormField>
                         <FormField label="Water Intake (L/day)">
                            <input type="number" name="waterIntake" value={profile.waterIntake} onChange={handleChange} placeholder="e.g., 2.5" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Sleep Duration (hrs/day)">
                             <input type="number" name="sleepDuration" value={profile.sleepDuration} onChange={handleChange} placeholder="e.g., 7" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Smoking Habit">
                            <select name="smokingHabit" value={profile.smokingHabit} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                               {['Never', 'Occasionally', 'Regularly'].map(s => <option key={s}>{s}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Alcohol Consumption">
                            <select name="alcoholConsumption" value={profile.alcoholConsumption} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                               {['None', 'Occasionally', 'Regularly'].map(a => <option key={a}>{a}</option>)}
                            </select>
                        </FormField>
                         <FormField label="Exercise Routine" className="sm:col-span-2">
                            <input type="text" name="exerciseRoutine" value={profile.exerciseRoutine} onChange={handleChange} placeholder="e.g., Walking, Gym, Yoga, None" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                        <FormField label="Daily Vitals Reminder" className="sm:col-span-2" helperText="Set a time to get a daily reminder to track your vitals.">
                            <input type="time" name="vitalsReminderTime" value={profile.vitalsReminderTime || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                        </FormField>
                    </div>
                </SectionCard>

                <SectionCard 
                    icon={<SparklesIcon className="w-6 h-6" />} 
                    title="General Health Tips"
                    iconContainerClassName="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400"
                >
                    <ul className="space-y-3 list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                        <li>Stay hydrated by drinking 8-10 glasses of water daily.</li>
                        <li>Aim for 7-9 hours of quality sleep per night for better recovery.</li>
                        <li>Incorporate at least 30 minutes of moderate physical activity most days.</li>
                        <li>Eat a balanced diet rich in fruits, vegetables, and whole grains.</li>
                        <li>Regularly monitor key vitals to stay informed about your health trends.</li>
                        <li>Don't skip recommended health screenings; they are key for early detection.</li>
                    </ul>
                </SectionCard>

                {profile.gender === 'Female' && (
                  <SectionCard 
                      icon={<FlowerIcon className="w-6 h-6" />} 
                      title="Female Health Tracking"
                      iconContainerClassName="p-3 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500 dark:text-pink-400"
                  >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          <FormField label="Last Menstrual Period" helperText="Select the first day of your last period.">
                              <input type="date" name="lastMenstrualPeriod" value={profile.lastMenstrualPeriod} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                          </FormField>
                          <FormField label="Average Cycle Length (days)">
                              <input type="number" name="cycleLength" value={profile.cycleLength} onChange={handleChange} placeholder="e.g., 28" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                          </FormField>

                          <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Next Estimated Period:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{femaleHealthMetrics.nextPeriod}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Estimated Fertile Window:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{femaleHealthMetrics.fertileWindow}</span>
                              </div>
                          </div>
                          
                          <FormField label="Pregnancy Status" className="sm:col-span-2">
                              <select name="isPregnant" value={profile.isPregnant} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                                  <option>No</option><option>Yes</option><option>Unknown</option>
                              </select>
                          </FormField>
                          
                          {profile.isPregnant === 'Yes' && (
                              <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">Estimated Delivery Date:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-300">{femaleHealthMetrics.edd}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">Gestation Progress:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-300">{femaleHealthMetrics.gestation}</span>
                                  </div>
                                   <div className="flex justify-between items-center text-sm">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">Current Trimester:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-300">{femaleHealthMetrics.trimester}</span>
                                  </div>
                              </div>
                          )}

                      </div>
                  </SectionCard>
                )}
                
                <SectionCard icon={<SparklesIcon className="w-6 h-6" />} title="AI-Powered Report Interpretation">
                    <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4 mb-4">Get a personalized, educational summary of your lab reports based on your profile. You can upload multiple files.</p>
                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                        {(['upload', 'manual'] as const).map((mode) => (
                            <button key={mode} onClick={() => setInputMode(mode)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMode === mode ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:border-slate-300'}`}>
                                {mode === 'upload' ? 'Upload Files' : 'Manual Entry'}
                            </button>
                        ))}
                    </div>
                    
                    {inputMode === 'upload' ? (
                        <div>
                            <div onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files); }} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-700/20">
                                <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Drag & drop files or click to browse</p>
                                <input type="file" multiple onChange={(e) => handleFileChange(e.target.files)} className="sr-only" id="profile-file-upload" accept=".pdf,.png,.jpg,.jpeg" />
                                <label htmlFor="profile-file-upload" className="mt-2 text-xs font-semibold text-primary dark:text-primary-light cursor-pointer">Select Files</label>
                            </div>
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <ul className="max-h-28 overflow-y-auto space-y-2 pr-2">
                                        {files.map((file, index) => (
                                            <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                                <span className="truncate">{file.name}</span>
                                                <button onClick={() => handleRemoveFile(index)} className="ml-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                         <textarea value={labResultText} onChange={(e) => setLabResultText(e.target.value)} placeholder="Paste your lab results here..." className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-primary" />
                    )}
                    
                    <button onClick={handleGetInterpretation} disabled={isLoading} className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg disabled:bg-slate-400 hover:bg-primary-dark transition-colors">
                        <SparklesIcon className="w-5 h-5"/>
                        {isLoading ? 'Analyzing...' : 'Get Personalized Interpretation'}
                    </button>
                    
                    {error && <p className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    
                    {interpretation && (
                        <div className="mt-6 border-t dark:border-slate-700 pt-4">
                             <div
                                className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                                dangerouslySetInnerHTML={renderMarkdown(interpretation)}
                            />
                        </div>
                    )}

                </SectionCard>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8 sticky bottom-4">
                {isSaved && <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in bg-green-100 dark:bg-green-900/50 px-4 py-2 rounded-lg">Profile saved successfully!</p>}
                <button
                    onClick={handleSave}
                    className="inline-flex items-center justify-center px-8 py-3 bg-secondary hover:bg-secondary-dark text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                >
                    <SaveIcon className="w-5 h-5 mr-2"/>
                    Save Profile
                </button>
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-6 pb-4">
                Your data is saved only in your browser and is not sent to any server.
            </p>
        </div>
    );
};

export default UserProfile;