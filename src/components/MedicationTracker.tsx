import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Medication, Dose } from '../types';
import { PlusCircleIcon, PillIcon, SaveIcon, CloseIcon, TrashIcon, HistoryIcon, CheckCircleIcon, EditIcon, UploadIcon, CameraIcon, SparklesIcon, PhotoIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { extractMedicationDetailsFromImage, extractMedicationsFromInput, classifyMedications, getMedicationComparisonSuggestion } from '../services/geminiService';

const MEDS_KEY = 'healthpath_medications';
const FREQUENCY_MAP: Record<Medication['frequency'], number> = {
    'Once a day': 1, 'Twice a day': 2, 'Thrice a day': 3, 'Four times a day': 4, 'As needed': 0, 'Custom': 0,
};

// FIX: Hoisted MergeConflict type to the top-level scope so it can be used by SmartMergeModal.
type MergeConflict = { existingMed: Medication, newMed: Partial<Medication> & { genericName?: string, classification?: string } };

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const SmartImportModal: React.FC<{
    onClose: () => void;
    onSaveAll: (meds: Partial<Medication>[]) => void;
}> = ({ onClose, onSaveAll }) => {
    const [stage, setStage] = useState<'input' | 'review'>('input');
    const [inputType, setInputType] = useState<'upload' | 'text'>('upload');
    const [files, setFiles] = useState<File[]>([]);
    const [text, setText] = useState('');
    const [extractedMeds, setExtractedMeds] = useState<Partial<Medication>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            setFiles(Array.from(selectedFiles));
        }
    };
    
    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAnalyze = async () => {
        if (inputType === 'upload' && files.length === 0) {
            setError('Please upload at least one file.');
            return;
        }
        if (inputType === 'text' && !text.trim()) {
            setError('Please enter some text to analyze.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const input = {
                text: inputType === 'text' ? text : undefined,
                files: inputType === 'upload' ? files : undefined,
            };

            const resultJson = await extractMedicationsFromInput(input);
            const parsedResult = JSON.parse(resultJson);

            if (parsedResult.error) {
                setError(parsedResult.error);
            } else if (Array.isArray(parsedResult)) {
                if(parsedResult.length === 0) {
                    setError("AI could not detect any medications. Please try with a clearer image or more specific text.");
                } else {
                    setExtractedMeds(parsedResult.map(med => ({...med}))); // Create a mutable copy
                    setStage('review');
                }
            } else {
                setError('AI returned an unexpected format.');
            }
        } catch (e) {
            setError('Failed to parse AI response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMedChange = (index: number, field: keyof Medication, value: string) => {
        const updatedMeds = [...extractedMeds];
        updatedMeds[index] = { ...updatedMeds[index], [field]: value };
        setExtractedMeds(updatedMeds);
    };

    const handleRemoveMed = (index: number) => {
        setExtractedMeds(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSaveAll = () => {
        onSaveAll(extractedMeds);
    };

    const renderInputStage = () => (
        <>
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                {(['upload', 'text'] as const).map((mode) => (
                    <button key={mode} onClick={() => setInputType(mode)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputType === mode ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:border-slate-300'}`}>
                        {mode === 'upload' ? 'Upload Prescription' : 'Paste Text'}
                    </button>
                ))}
            </div>

            {inputType === 'upload' ? (
                <div onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files); }} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center bg-slate-50/50 dark:bg-slate-700/20">
                    <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Drag & drop files or click to browse</p>
                    <input type="file" multiple onChange={(e) => handleFileChange(e.target.files)} className="sr-only" id="smart-import-upload" accept=".pdf,.png,.jpg,.jpeg" />
                    <label htmlFor="smart-import-upload" className="mt-2 text-xs font-semibold text-primary dark:text-primary-light cursor-pointer">Select Files</label>
                    {files.length > 0 && (
                        <ul className="mt-4 text-left max-h-24 overflow-y-auto space-y-1 pr-2">
                            {files.map((file, index) => (
                                <li key={index} className="flex justify-between items-center text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded">
                                    <span className="truncate">{file.name}</span>
                                    <button onClick={() => handleRemoveFile(index)} className="ml-2 p-0.5 text-red-500 rounded-full"><TrashIcon className="w-3 h-3"/></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., Dolo 650, 1 tablet thrice a day after food..." className="w-full h-40 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700" />
            )}
        </>
    );
    
    const renderReviewStage = () => (
        <div className="space-y-3">
            <h4 className="font-semibold">Review Extracted Medications</h4>
            {extractedMeds.map((med, index) => (
                <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2 relative">
                     <button onClick={() => handleRemoveMed(index)} className="absolute top-2 right-2 p-1 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-4 h-4"/></button>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><label className="text-xs font-medium">Name</label><input value={med.name} onChange={(e) => handleMedChange(index, 'name', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"/></div>
                        <div><label className="text-xs font-medium">Strength</label><input value={med.strength} onChange={(e) => handleMedChange(index, 'strength', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"/></div>
                        <div><label className="text-xs font-medium">Form</label><select value={med.dosageForm} onChange={(e) => handleMedChange(index, 'dosageForm', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">{['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'].map(f=><option key={f}>{f}</option>)}</select></div>
                        <div><label className="text-xs font-medium">Frequency</label><select value={med.frequency} onChange={(e) => handleMedChange(index, 'frequency', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">{['Once a day', 'Twice a day', 'Thrice a day', 'Four times a day', 'As needed', 'Custom'].map(f=><option key={f}>{f}</option>)}</select></div>
                        <div className="col-span-2"><label className="text-xs font-medium">Meal Relation</label><select value={med.mealRelation} onChange={(e) => handleMedChange(index, 'mealRelation', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">{['Before meals', 'After meals', 'With meals', 'Any time'].map(f=><option key={f}>{f}</option>)}</select></div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">✨ Smart Medicine Import</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                </header>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <SparklesIcon className="w-10 h-10 text-primary animate-spin"/>
                            <p className="mt-2 font-semibold">AI is analyzing your input...</p>
                        </div>
                    ) : (
                        <>
                            {error && <p className="mb-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
                            {stage === 'input' ? renderInputStage() : renderReviewStage()}
                        </>
                    )}
                </div>
                <footer className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-4">
                    {stage === 'input' ? (
                        <button onClick={handleAnalyze} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg"><SparklesIcon className="w-5 h-5"/> Analyze with AI</button>
                    ) : (
                        <>
                            <button onClick={() => setStage('input')} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg">Go Back</button>
                            <button onClick={handleSaveAll} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-bold rounded-lg"><SaveIcon className="w-5 h-5"/> Save All</button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};

// FIX: Add SmartMergeModal component definition to resolve "Cannot find name 'SmartMergeModal'" error.
const SmartMergeModal: React.FC<{
    conflict: MergeConflict;
    onClose: () => void;
    onResolve: (resolution: { decision: 'add_new' | 'merge', keep?: 'existing' | 'new' }) => void;
    aiSuggestion: string | null;
    onFetchSuggestion: () => void;
    isLoading: boolean;
}> = ({ conflict, onClose, onResolve, aiSuggestion, onFetchSuggestion, isLoading }) => {
    const { existingMed, newMed } = conflict;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Merge Assistant</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                </header>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    <p className="text-sm text-slate-500">
                        AI detected a similar medication. Please choose how to proceed. Both are classified as a <strong>{newMed.classification}</strong>.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg border-slate-300 dark:border-slate-600">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">Existing Medication</h4>
                            <p><strong>Name:</strong> {existingMed.name}</p>
                            <p><strong>Strength:</strong> {existingMed.strength}</p>
                            <p><strong>Schedule:</strong> {existingMed.frequency}</p>
                        </div>
                        <div className="p-4 border rounded-lg border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                            <h4 className="font-bold text-blue-800 dark:text-blue-200">New from Import</h4>
                            <p><strong>Name:</strong> {newMed.name}</p>
                            <p><strong>Strength:</strong> {newMed.strength}</p>
                            <p><strong>Schedule:</strong> {newMed.frequency}</p>
                        </div>
                    </div>
                    
                    <div>
                        <button onClick={onFetchSuggestion} disabled={isLoading} className="text-sm flex items-center gap-2 text-primary font-semibold disabled:opacity-50">
                            <SparklesIcon className={`w-4 h-4 ${isLoading && !aiSuggestion ? 'animate-spin' : ''}`}/> 
                            {isLoading && !aiSuggestion ? 'Getting suggestion...' : 'Ask AI to compare'}
                        </button>
                        {aiSuggestion && (
                            <div className="mt-2 text-xs p-3 bg-slate-100 dark:bg-slate-700 rounded-lg italic">
                                <strong>AI Suggestion:</strong> {aiSuggestion}
                            </div>
                        )}
                    </div>

                </div>
                <footer className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <p className="text-sm font-semibold text-center">How would you like to handle this?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => onResolve({ decision: 'add_new' })} className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-600 font-semibold rounded-lg">Add as New Medication</button>
                        <div className="space-y-2">
                             <p className="text-xs text-center text-slate-500">Or merge, keeping details from:</p>
                            <div className="flex gap-2">
                                <button onClick={() => onResolve({ decision: 'merge', keep: 'existing' })} className="flex-1 px-4 py-2 bg-secondary text-white font-semibold rounded-lg">Keep Existing</button>
                                <button onClick={() => onResolve({ decision: 'merge', keep: 'new' })} className="flex-1 px-4 py-2 bg-secondary text-white font-semibold rounded-lg">Keep New</button>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

// ... (MedicationModal and other components remain the same for now) ...

// --- MAIN COMPONENT ---
const MedicationTracker: React.FC = () => {
    // ... (existing state) ...
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);
    const [currentMed, setCurrentMed] = useState<Partial<Medication> | null>(null);
    const [toastMessage, setToastMessage] = useState('');

    // --- NEW STATE FOR MERGE ASSISTANT ---
    const [mergeQueue, setMergeQueue] = useState<MergeConflict[]>([]);
    const [pendingDirectAdds, setPendingDirectAdds] = useState<Partial<Medication>[]>([]);
    const [currentMergeConflict, setCurrentMergeConflict] = useState<MergeConflict | null>(null);
    const [mergeAiSuggestion, setMergeAiSuggestion] = useState<string | null>(null);
    const [isMergeLoading, setIsMergeLoading] = useState(false);


    useEffect(() => {
        try {
            const savedMeds = localStorage.getItem(MEDS_KEY);
            if (savedMeds) {
                setMedications(JSON.parse(savedMeds));
            }
        } catch (e) { console.error("Failed to parse medications:", e); }
    }, []);

    const saveMedications = (updatedMeds: Medication[]) => {
        localStorage.setItem(MEDS_KEY, JSON.stringify(updatedMeds));
        setMedications(updatedMeds);
        window.dispatchEvent(new Event('notificationsUpdated'));
    };
    
    // ... (handleSave, handleDelete, handleTakeDose, handleEdit, handleAddNewManually remain the same) ...
     const handleSave = (med: Medication) => {
        const exists = medications.some(m => m.id === med.id);
        const updated = exists ? medications.map(m => m.id === med.id ? med : m) : [...medications, med];
        saveMedications(updated);
        setIsModalOpen(false);
        setCurrentMed(null);
    };

    // --- NEW MERGE LOGIC ---
    const processNextMergeConflict = () => {
        if (mergeQueue.length > 0) {
            const nextConflict = mergeQueue[0];
            setCurrentMergeConflict(nextConflict);
            setMergeQueue(prev => prev.slice(1));
        } else {
            // No more conflicts, finalize the save process
            const medsToAdd = pendingDirectAdds.map(med => ({
                id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                dosesTaken: [],
                startDate: new Date().toISOString().split('T')[0],
                durationDays: '7',
                ...med,
            } as Medication));

            saveMedications([...medications, ...medsToAdd]);
            setCurrentMergeConflict(null);
            setPendingDirectAdds([]);
            
            let toastMsg = '';
            if (medsToAdd.length > 0) {
                toastMsg = `✨ ${medsToAdd.length} new medication(s) added.`;
            }
            if (toastMsg) {
                setToastMessage(toastMsg);
                setTimeout(() => setToastMessage(''), 4000);
            }
        }
    };
    
    const handleMergeResolution = (resolution: { decision: 'add_new' | 'merge', keep?: 'existing' | 'new' }) => {
        if (!currentMergeConflict) return;

        const { existingMed, newMed } = currentMergeConflict;

        if (resolution.decision === 'add_new') {
            setPendingDirectAdds(prev => [...prev, newMed]);
            setToastMessage(`Added ${newMed.name} as a new medication.`);
        } else if (resolution.decision === 'merge') {
            const medToKeep = resolution.keep === 'new' ? newMed : existingMed;
            const updatedMedications = medications.map(med => {
                if (med.id === existingMed.id) {
                    return {
                        ...med,
                        // Update with details of the one user chose to keep
                        name: medToKeep.name!,
                        strength: medToKeep.strength!,
                        dosageForm: medToKeep.dosageForm!,
                        // Always take schedule from the new prescription
                        frequency: newMed.frequency!,
                        mealRelation: newMed.mealRelation!,
                        notes: (med.notes ? med.notes + '\n' : '') + `Merged with ${newMed.name} on ${new Date().toLocaleDateString()}.`
                    };
                }
                return med;
            });
            setMedications(updatedMedications); // Directly update state, will be saved at the end
            setToastMessage(`✅ Merged successfully. Active: ${medToKeep.name}`);
        }
        
        // Hide suggestion and move to next item in queue or finish
        setMergeAiSuggestion(null);
        processNextMergeConflict();
    };


    const handleSaveAllFromSmartImport = async (meds: Partial<Medication>[]) => {
        setIsSmartImportModalOpen(false);
        const newMedNames = meds.map(m => m.name).filter(Boolean) as string[];
        const existingMedNames = medications.map(m => m.name);
        const allNamesToClassify = [...new Set([...newMedNames, ...existingMedNames])];

        if (allNamesToClassify.length === 0) return;

        setIsMergeLoading(true);

        let classificationMap: Record<string, { genericName: string; classification: string }> = {};
        try {
            const classificationJson = await classifyMedications(allNamesToClassify);
            const classificationResult = JSON.parse(classificationJson);
            if (classificationResult.error) throw new Error(classificationResult.error);
            classificationResult.forEach((item: any) => {
                classificationMap[item.originalName] = { genericName: item.genericName, classification: item.classification };
            });
        } catch (e) {
            console.error("Could not classify medications:", e);
            // Fallback: just add all new meds without merging
            const newMedsToAdd = meds.map(med => ({
                id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                dosesTaken: [], startDate: new Date().toISOString().split('T')[0], durationDays: '7', ...med,
            } as Medication));
            saveMedications([...medications, ...newMedsToAdd]);
            setToastMessage(`⚠️ AI classification failed. Added ${newMedsToAdd.length} medications without checking for duplicates.`);
            setTimeout(() => setToastMessage(''), 5000);
            setIsMergeLoading(false);
            return;
        }

        const enrichedExistingMeds = medications.map(med => ({
            ...med,
            ...(classificationMap[med.name] || {})
        }));

        const conflicts: MergeConflict[] = [];
        const directAdds: Partial<Medication>[] = [];

        for (const newMed of meds) {
            const newMedInfo = classificationMap[newMed.name!];
            if (!newMedInfo || !newMedInfo.classification) {
                directAdds.push(newMed);
                continue;
            }

            const conflict = enrichedExistingMeds.find(
                (existing) => existing.classification === newMedInfo.classification && existing.genericName !== newMedInfo.genericName
            );

            if (conflict) {
                conflicts.push({ existingMed: conflict, newMed: { ...newMed, ...newMedInfo } });
            } else {
                directAdds.push({ ...newMed, ...newMedInfo });
            }
        }
        
        setPendingDirectAdds(directAdds);
        setMergeQueue(conflicts);

        if (conflicts.length > 0) {
            processNextMergeConflict(); // This will open the modal for the first conflict
        } else {
            // No conflicts, just save the direct adds
            processNextMergeConflict();
        }
        setIsMergeLoading(false);
    };

    const fetchMergeSuggestion = async () => {
        if (!currentMergeConflict) return;
        setIsMergeLoading(true);
        const suggestion = await getMedicationComparisonSuggestion(currentMergeConflict.existingMed.name, currentMergeConflict.newMed.name!);
        setMergeAiSuggestion(suggestion);
        setIsMergeLoading(false);
    };

    // ... (existing functions for take dose, delete, etc.) ...
     const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this medication?")) {
            const updatedMeds = medications.filter(m => m.id !== id);
            saveMedications(updatedMeds);
        }
    };

    const handleTakeDose = (id: string, name: string) => {
        const updatedMeds = medications.map(m => 
            m.id === id ? { ...m, dosesTaken: [...m.dosesTaken, { timestamp: new Date().toISOString() }] } : m
        );
        saveMedications(updatedMeds);
        
        const todayStr = new Date().toDateString();
        let totalExpectedToday = 0;
        let totalTakenToday = 0;

        updatedMeds.forEach(med => {
            const start = new Date(med.startDate);
            const duration = parseInt(med.durationDays, 10);
            if(isNaN(start.getTime()) || isNaN(duration)) return;
            const end = new Date(start);
            end.setDate(start.getDate() + duration);
            const today = new Date();
            if (today >= start && today < end) {
                if(med.frequency !== 'As needed' && med.frequency !== 'Custom') {
                    totalExpectedToday += FREQUENCY_MAP[med.frequency];
                }
            }
            totalTakenToday += med.dosesTaken.filter(d => new Date(d.timestamp).toDateString() === todayStr).length;
        });
        
        const remaining = totalExpectedToday - totalTakenToday;

        if (totalExpectedToday > 0 && remaining <= 0) {
            setToastMessage('All medicines taken for today 🎉 Stay consistent!');
        } else {
             setToastMessage(`Good job 👏 — ${name} taken. ${remaining > 0 ? `${remaining} more left for today.` : ''}`);
        }
        
        setTimeout(() => setToastMessage(''), 4000);
    };
    
    const handleEdit = (med: Medication) => {
        setCurrentMed(med);
        setIsModalOpen(true);
    };

    const handleAddNewManually = () => {
        setCurrentMed({});
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Medication Tracker</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your medication schedule and track your adherence.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsSmartImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-dark transition-colors">
                        <SparklesIcon className="w-5 h-5"/> ✨ Smart Import
                    </button>
                    <button onClick={handleAddNewManually} className="text-sm font-semibold text-primary dark:text-primary-light p-2 rounded-lg hover:bg-primary-light/10">
                        + Add Manually
                    </button>
                </div>
            </div>
            
            <MedicationCalendar medications={medications} />

            {medications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {medications.map(med => (
                        <MedicationCard key={med.id} medication={med} onTakeDose={handleTakeDose} onDelete={handleDelete} onEdit={handleEdit} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
                    <PillIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                    <h3 className="mt-4 text-xl font-bold text-slate-700 dark:text-slate-300">No Medications Added</h3>
                    <p className="text-slate-500 mt-2">Click "Add Medication" or "Smart Import" to start tracking.</p>
                </div>
            )}

            {isModalOpen && <MedicationModal medication={currentMed} onClose={() => { setIsModalOpen(false); setCurrentMed(null); }} onSave={handleSave} />}
            
            {isSmartImportModalOpen && (
                <SmartImportModal 
                    onClose={() => setIsSmartImportModalOpen(false)}
                    onSaveAll={handleSaveAllFromSmartImport}
                />
            )}
            
            {currentMergeConflict && (
                <SmartMergeModal 
                    conflict={currentMergeConflict}
                    onClose={() => setCurrentMergeConflict(null)}
                    onResolve={handleMergeResolution}
                    aiSuggestion={mergeAiSuggestion}
                    onFetchSuggestion={fetchMergeSuggestion}
                    isLoading={isMergeLoading}
                />
            )}

            {toastMessage && (
                <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up z-50">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};


// ... (MedicationCalendar and MedicationCard components remain the same) ...
// The definitions for MedicationModal, MedicationCalendar, and MedicationCard should be here.
// For brevity, I will copy them without re-typing. They are unchanged from the previous version.
// All sub-components are being included for completeness.

const MedicationModal: React.FC<{
    medication: Partial<Medication> | null;
    onClose: () => void;
    onSave: (med: Medication) => void;
}> = ({ medication, onClose, onSave }) => {
    const [formState, setFormState] = useState<Partial<Medication>>({
        name: '', strength: '', dosageForm: 'Tablet', frequency: 'Twice a day',
        mealRelation: 'Any time', startDate: new Date().toISOString().split('T')[0], durationDays: '7', notes: '', image: ''
    });

    const [isAiLoading, setIsAiLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCameraViewOpen, setIsCameraViewOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (medication) {
            setFormState(prev => ({...prev, ...medication}));
        }
    }, [medication]);

    const handleFormChange = (name: string, value: string) => {
        setFormState(prev => {
            const newState = { ...prev, [name]: value };

            const { startDate, durationDays, endDate } = newState;

            if (name === 'startDate' || name === 'durationDays') {
                const start = new Date(startDate || '');
                const duration = parseInt(durationDays || '0', 10);
                if (!isNaN(start.getTime()) && !isNaN(duration) && duration > 0) {
                    const end = new Date(start);
                    end.setDate(start.getDate() + duration - 1);
                    newState.endDate = end.toISOString().split('T')[0];
                } else {
                    newState.endDate = '';
                }
            } else if (name === 'endDate') {
                const start = new Date(startDate || '');
                const end = new Date(value);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                    const diffTime = end.getTime() - start.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    newState.durationDays = diffDays.toString();
                } else {
                    newState.durationDays = '';
                }
            }
            return newState;
        });
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        handleFormChange(e.target.name, e.target.value);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setFormState({ ...formState, image: base64 });
        }
    };

    const handleSave = () => {
        if (!formState.name || !formState.strength || !formState.durationDays) {
            alert('Please fill in Name, Strength, and Duration.');
            return;
        }
        
        const finalFormState = {...formState};
        if (finalFormState.frequency !== 'Custom') {
            delete finalFormState.customFrequency;
        }

        const medToSave: Medication = {
            id: medication?.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            dosesTaken: medication?.dosesTaken || [],
            ...finalFormState
        } as Medication;
        onSave(medToSave);
    };

    const processImageFile = async (file: File) => {
        setIsAiLoading(true);
        try {
            const jsonString = await extractMedicationDetailsFromImage(file);
            const parsedResult = JSON.parse(jsonString);

            if (parsedResult.error) {
                alert(`AI Error: ${parsedResult.error}`);
            } else {
                setFormState(prev => ({
                    ...prev,
                    name: parsedResult.name || prev.name || '',
                    strength: parsedResult.strength || prev.strength || '',
                    dosageForm: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'].includes(parsedResult.dosageForm) ? parsedResult.dosageForm : prev.dosageForm || 'Tablet',
                }));
            }
        } catch (err) {
            alert("Failed to process image with AI.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraViewOpen(true);
            }
        } catch (err) { alert("Could not access camera. Check permissions."); }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCameraViewOpen(false);
        }
    };
    
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            stopCamera();
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                    processImageFile(file);
                }
            }, 'image/jpeg');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg relative">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">{medication?.id ? 'Edit' : 'Add'} Medication</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-primary"/> Quick Add with AI</h4>
                        <div className="flex gap-2">
                             <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && e.target.files.length > 0 && processImageFile(e.target.files[0])} className="hidden" accept="image/*" />
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md font-semibold hover:bg-slate-100 dark:hover:bg-slate-600"><UploadIcon className="w-4 h-4"/> Scan from Image</button>
                            <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md font-semibold hover:bg-slate-100 dark:hover:bg-slate-600"><CameraIcon className="w-4 h-4"/> Scan from Camera</button>
                        </div>
                    </div>

                     <div className="flex gap-4 items-start">
                        <div className="flex-grow">
                            <label className="text-sm font-medium">Drug Name</label>
                            <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="e.g., Paracetamol" className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                        </div>
                        <div className="flex-shrink-0">
                            <label className="text-sm font-medium">Image</label>
                            <div className="mt-1">
                                <input type="file" accept="image/*" onChange={handleImageChange} id="med-image-upload" className="hidden"/>
                                <label htmlFor="med-image-upload" className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    {formState.image ? (
                                        <img src={formState.image} alt="Preview" className="w-full h-full object-cover rounded-lg"/>
                                    ) : (
                                        <PhotoIcon className="w-8 h-8 text-slate-400"/>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                    {formState.image && <button onClick={() => setFormState({...formState, image: ''})} className="text-xs text-red-500 hover:underline">Remove Image</button>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Strength</label>
                            <input type="text" name="strength" value={formState.strength} onChange={handleChange} placeholder="e.g., 500mg" className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                        </div>
                        <div>
                             <label className="text-sm font-medium">Dosage Form</label>
                            <select name="dosageForm" value={formState.dosageForm} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'].map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Frequency</label>
                            <select name="frequency" value={formState.frequency} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                {['Once a day', 'Twice a day', 'Thrice a day', 'Four times a day', 'As needed', 'Custom'].map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                        {formState.frequency === 'Custom' ? (
                            <div>
                                <label className="text-sm font-medium">Custom Frequency</label>
                                <input type="text" name="customFrequency" value={formState.customFrequency || ''} onChange={handleChange} placeholder="e.g., Every 8 hours" className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium">Meal Relation</label>
                                 <select name="mealRelation" value={formState.mealRelation} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    {['Before meals', 'After meals', 'With meals', 'Any time'].map(f => <option key={f}>{f}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Start Date</label>
                            <input type="date" name="startDate" value={formState.startDate} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                        </div>
                        <div>
                             <label className="text-sm font-medium">Duration (days)</label>
                            <input type="number" name="durationDays" value={formState.durationDays} onChange={handleChange} placeholder="e.g., 5" className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                        </div>
                        <div>
                             <label className="text-sm font-medium">End Date</label>
                            <input type="date" name="endDate" value={formState.endDate || ''} onChange={(e) => handleFormChange('endDate', e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Notes (optional)</label>
                        <textarea name="notes" value={formState.notes} onChange={handleChange} rows={2} placeholder="e.g., For fever" className="w-full mt-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
                    </div>
                </div>
                <footer className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                     <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-bold rounded-lg"><SaveIcon className="w-5 h-5"/> Save Medication</button>
                </footer>

                {isAiLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 z-10 flex flex-col items-center justify-center">
                        <SparklesIcon className="w-10 h-10 text-primary animate-spin"/>
                        <p className="mt-2 font-semibold">AI is analyzing...</p>
                    </div>
                )}
            </div>
            {isCameraViewOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-lg mb-4" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-4">
                        <button onClick={capturePhoto} className="px-6 py-3 bg-secondary text-white font-bold rounded-lg">Capture</button>
                        <button onClick={stopCamera} className="px-6 py-3 bg-slate-600 text-white font-bold rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MedicationCalendar: React.FC<{ medications: Medication[] }> = ({ medications }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Set to first day to avoid month skipping issues
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const { monthGrid, monthName, year } = useMemo(() => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const grid: (Date | null)[] = [];
        for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));

        const getMedsForDay = (day: Date) => {
            return medications.filter(med => {
                const start = new Date(med.startDate);
                const duration = parseInt(med.durationDays, 10);
                if (isNaN(start.getTime()) || isNaN(duration)) return false;
                
                const end = new Date(start);
                end.setDate(start.getDate() + duration);

                day.setHours(0,0,0,0);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);

                return day >= start && day < end;
            });
        };
        
        return { 
            monthGrid: grid.map(day => day ? { day, meds: getMedsForDay(day) } : null),
            monthName: currentDate.toLocaleString('default', { month: 'long' }),
            year
        };
    }, [currentDate, medications]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5"/></button>
                <h3 className="text-md sm:text-lg font-bold">{monthName} {year}</h3>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                {weekDays.map(day => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
                {monthGrid.map((dayInfo, index) => (
                    <div key={index} className={`h-18 p-0.5 flex flex-col items-center border border-slate-200 dark:border-slate-700 rounded transition-colors ${dayInfo ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        {dayInfo && (
                            <>
                                <span className={`text-xs ${new Date().toDateString() === dayInfo.day.toDateString() ? 'font-bold text-white bg-primary rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{dayInfo.day.getDate()}</span>
                                <div className="mt-1 w-full space-y-0.5 overflow-y-auto max-h-12">
                                    {dayInfo.meds.map(med => (
                                        <div key={med.id} className="flex items-center justify-center gap-1 text-[10px] px-1 bg-blue-100 dark:bg-blue-900/50 rounded" title={med.name}>
                                            <PillIcon className="w-2.5 h-2.5 text-blue-500 flex-shrink-0"/>
                                            <span className="truncate">{med.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const MedicationCard: React.FC<{
    medication: Medication;
    onTakeDose: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onEdit: (med: Medication) => void;
}> = ({ medication, onTakeDose, onDelete, onEdit }) => {
    const { name, strength, dosageForm, frequency, mealRelation, startDate, durationDays, dosesTaken, notes, customFrequency } = medication;
    
    const { adherence, dosesTakenToday, expectedDoses, isDue, isActive } = useMemo(() => {
        const start = new Date(startDate);
        const duration = parseInt(durationDays, 10);
        if (isNaN(start.getTime()) || isNaN(duration)) return { adherence: 0, dosesTakenToday: 0, expectedDoses: 0, isDue: false, isActive: false };

        const end = new Date(start);
        end.setDate(start.getDate() + duration);
        const today = new Date();
        const isActive = today >= start && today < end;

        if (frequency === 'As needed' || frequency === 'Custom') {
            const takenToday = dosesTaken.filter(d => new Date(d.timestamp).toDateString() === today.toDateString()).length;
            return { adherence: 100, dosesTakenToday: takenToday, expectedDoses: 0, isDue: true, isActive };
        }
        
        const expectedDosesPerDay = FREQUENCY_MAP[frequency];
        const daysSinceStart = Math.max(0, Math.floor((new Date(today.toDateString()).getTime() - new Date(start.toDateString()).getTime()) / (1000 * 3600 * 24)));
        const totalExpectedDosesSoFar = Math.min(daysSinceStart + 1, duration) * expectedDosesPerDay;
        const totalTaken = dosesTaken.filter(d => new Date(d.timestamp) < today).length;
        const adherence = totalExpectedDosesSoFar > 0 ? (totalTaken / totalExpectedDosesSoFar) * 100 : 100;

        const dosesTakenTodayCount = dosesTaken.filter(d => new Date(d.timestamp).toDateString() === today.toDateString()).length;
        const isDueNow = isActive && dosesTakenTodayCount < expectedDosesPerDay;

        return { adherence, dosesTakenToday: dosesTakenTodayCount, expectedDoses: expectedDosesPerDay, isDue: isDueNow, isActive };
    }, [medication]);

    const safeAdherence = isNaN(adherence) ? 0 : adherence;
    
    let colorClass = 'text-green-500';
    if (safeAdherence < 75) colorClass = 'text-yellow-500';
    if (safeAdherence < 50) colorClass = 'text-red-500';

    const size = 80;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safeAdherence / 100) * circumference;

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col transition-opacity ${!isActive ? 'opacity-60' : ''}`}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {medication.image ? (
                            <img src={medication.image} alt={name} className="w-12 h-12 rounded-lg object-cover bg-slate-100"/>
                        ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-primary-light/10 rounded-lg">
                                <PillIcon className="w-6 h-6 text-primary"/>
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-primary dark:text-primary-light">{name} <span className="text-sm font-normal text-slate-500">{strength}</span></h3>
                            <p className="text-sm text-slate-500">{dosageForm}</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => onEdit(medication)} className="p-1 text-slate-400 hover:text-primary"><EditIcon className="w-4 h-4"/></button>
                       <button onClick={() => onDelete(medication.id)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
                {notes && <p className="text-xs italic text-slate-500 mt-2">"{notes}"</p>}
                
                <div className="mt-4 flex flex-col items-center">
                    <div className="relative flex flex-col items-center">
                        <div className="relative" style={{ width: size, height: size }}>
                            <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                <circle
                                    className="text-slate-200 dark:text-slate-700"
                                    strokeWidth={strokeWidth}
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx={size / 2}
                                    cy={size / 2}
                                />
                                <circle
                                    className={`transition-all duration-500 ease-in-out ${colorClass}`}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx={size / 2}
                                    cy={size / 2}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800 dark:text-slate-200">
                                {Math.round(safeAdherence)}%
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 mt-1">Adherence</span>
                    </div>
                </div>
                
                <div className="mt-3 text-center text-sm p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    Take <strong>{frequency === 'Custom' ? customFrequency : frequency}</strong>, {mealRelation}.
                </div>

                <div className="mt-4">
                     <button onClick={() => onTakeDose(medication.id, medication.name)} disabled={!isDue} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-bold rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                        <CheckCircleIcon className="w-5 h-5"/> Take Now ({dosesTakenToday}/{frequency !== 'As needed' && frequency !== 'Custom' ? expectedDoses : '∞'})
                    </button>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
                <h5 className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2"><HistoryIcon className="w-4 h-4"/> Recent Doses</h5>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 max-h-20 overflow-y-auto">
                    {dosesTaken.length > 0 ? [...dosesTaken].reverse().slice(0,5).map(dose => (
                        <li key={dose.timestamp}>{new Date(dose.timestamp).toLocaleString()}</li>
                    )) : <li>No doses taken yet.</li>}
                </ul>
            </div>
        </div>
    );
};


export default MedicationTracker;
