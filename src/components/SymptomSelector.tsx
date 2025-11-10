
import React, { useState, useMemo } from 'react';
import { CloseIcon, SparklesIcon, TeethIcon, SkinIcon, HeadIcon, ChestIcon, StomachIcon, LegIcon, PelvicIcon, SpineIcon, EyeIcon, EarIcon, NoseIcon, ThroatIcon, HandIcon, FootIcon, LiverIcon } from './Icons';

type SymptomCategory = {
    id: string;
    name: string;
    icon: React.FC<{ className?: string }>;
    symptoms: string[];
};

const SYMPTOM_DATA: SymptomCategory[] = [
    { id: 'head', name: 'Head', icon: HeadIcon, symptoms: ['Headache or Pressure', 'Dizziness or Faint Feeling', 'Memory Issue', 'Stress / Lack of Sleep', 'Blurred Vision / Eye Strain'] },
    { id: 'eyes', name: 'Eyes', icon: EyeIcon, symptoms: ['Redness or Itching', 'Watering Eyes', 'Blurred Vision', 'Pain around Eyes', 'Light Sensitivity'] },
    { id: 'ears', name: 'Ears', icon: EarIcon, symptoms: ['Ear Pain', 'Hearing Problem', 'Ringing Sound (Buzz)', 'Discharge / Blocked Ear', 'Balance Problem'] },
    { id: 'nose', name: 'Nose/Sinus', icon: NoseIcon, symptoms: ['Blocked Nose', 'Sneezing / Runny Nose', 'Sinus Pressure (Head/Face)', 'Nose Bleeding', 'Loss of Smell'] },
    { id: 'mouth', name: 'Teeth/Mouth', icon: TeethIcon, symptoms: ['Tooth Pain', 'Swollen Gums', 'Sensitive to Hot/Cold', 'Bad Breath', 'Bleeding while Brushing'] },
    { id: 'throat', name: 'Throat/Neck', icon: ThroatIcon, symptoms: ['Sore Throat', 'Pain while Swallowing', 'Voice Change / Hoarse Voice', 'Neck Swelling', 'Dry Throat / Cough'] },
    { id: 'chest', name: 'Chest', icon: ChestIcon, symptoms: ['Chest Pain or Tightness', 'Fast Heartbeat', 'Shortness of Breath', 'Cough or Wheezing', 'Pain while Breathing'] },
    { id: 'spine', name: 'Spine/Back', icon: SpineIcon, symptoms: ['Back Pain (Upper/Lower)', 'Neck Stiffness', 'Shoulder Pain', 'Nerve Pull / Sciatica', 'Posture Problem'] },
    { id: 'stomach', name: 'Stomach', icon: StomachIcon, symptoms: ['Stomach Pain or Cramps', 'Gas or Acidity', 'Vomiting or Nausea', 'Constipation / Loose Motion', 'Loss of Appetite'] },
    { id: 'liver', name: 'Liver', icon: LiverIcon, symptoms: ['Pain in Right Upper Belly', 'Yellow Eyes or Skin', 'Loss of Appetite', 'Fatigue / Weakness', 'Dark Urine or Pale Stool'] },
    { id: 'pelvic', name: 'Pelvic', icon: PelvicIcon, symptoms: ['Pain while Urinating', 'Lower Belly Pain', 'Itching / Discharge', 'Missed Period / Irregular Cycle', 'Swelling or Discomfort'] },
    { id: 'skin', name: 'Skin', icon: SkinIcon, symptoms: ['Itching or Rash', 'Red Spots', 'Dry or Cracked Skin', 'Infection (Pimple, Boil)', 'Color Change (White/Black Patches)'] },
    { id: 'hands', name: 'Hands/Wrists', icon: HandIcon, symptoms: ['Wrist Pain', 'Finger Pain or Stiffness', 'Numbness / Tingling', 'Rash / Infection on Hand', 'Weak Grip'] },
    { id: 'legs', name: 'Legs/Joints', icon: LegIcon, symptoms: ['Knee Pain', 'Leg Swelling', 'Muscle Pain / Weakness', 'Numbness or Tingling', 'Difficulty Walking'] },
    { id: 'feet', name: 'Feet/Ankles', icon: FootIcon, symptoms: ['Foot Pain or Heel Pain', 'Swelling in Feet', 'Numbness or Burning', 'Fungal Infection (Itchy Toes)', 'Cracked Heels'] },
];

const SymptomSelector: React.FC = () => {
    const [expandedCategory, setExpandedCategory] = useState<SymptomCategory | null>(null);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

    const handleCategoryClick = (category: SymptomCategory) => {
        setExpandedCategory(current => (current?.id === category.id ? null : category));
    };

    const toggleSymptom = (symptom: string) => {
        setSelectedSymptoms(prev =>
            prev.includes(symptom)
                ? prev.filter(s => s !== symptom)
                : [...prev, symptom]
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Symptom Selector</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Select a body part, then choose the symptoms you're experiencing.</p>
            </div>

            {/* Selected Symptoms Area */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg mb-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex-grow">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Selected Symptoms ({selectedSymptoms.length})</h3>
                        <div className="flex flex-wrap gap-2">
                            {selectedSymptoms.length > 0 ? (
                                selectedSymptoms.map(symptom => (
                                    <div key={symptom} className="flex items-center gap-1 bg-primary text-white text-xs font-semibold px-2 py-1 rounded-full">
                                        <span>{symptom}</span>
                                        <button onClick={() => toggleSymptom(symptom)} className="p-0.5 rounded-full hover:bg-white/20">
                                            <CloseIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No symptoms selected yet.</p>
                            )}
                        </div>
                    </div>
                    <button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                        <SparklesIcon className="w-5 h-5"/> Analyze Symptoms
                    </button>
                </div>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                {SYMPTOM_DATA.map(category => (
                    <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 text-center rounded-2xl transition-all duration-200 aspect-square
                            ${expandedCategory?.id === category.id
                                ? 'bg-primary text-white shadow-lg scale-105'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md'
                            }`}
                    >
                        <category.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                        <span className="text-xs sm:text-sm font-semibold">{category.name}</span>
                    </button>
                ))}
            </div>

            {/* Symptom Picker */}
            {expandedCategory && (
                <div className="mt-8 animate-fade-in-up">
                    <h3 className="text-xl font-bold mb-4">Select Symptoms for: <span className="text-primary">{expandedCategory.name}</span></h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
                        {expandedCategory.symptoms.map(symptom => (
                            <button
                                key={symptom}
                                onClick={() => toggleSymptom(symptom)}
                                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors
                                ${selectedSymptoms.includes(symptom)
                                    ? 'bg-secondary text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                {symptom}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SymptomSelector;
