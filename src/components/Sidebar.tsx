

import React from 'react';
import { TestTubeIcon, BrainCircuitIcon, ChartBarIcon, BookOpenIcon, UserIcon, BloodDropIcon, CloseIcon, HistoryIcon, DumbbellIcon, StethoscopeIcon, MacroIcon, ChildIcon, RadiologyIcon, ScanIcon, UploadCloudIcon, HeartPulseIcon, ScaleIcon, CalendarDaysIcon, PillIcon, BodyScanIcon, SparklesIcon } from './Icons';
// FIX: Updated import path for View type to come from types.ts.
import { View } from '../types';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out
            ${isActive
                ? 'bg-primary-light/20 text-primary-dark dark:text-primary-light shadow-inner'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen }) => {
    const handleNavigation = (view: View) => {
        setView(view);
        if (window.innerWidth < 768) { // md breakpoint
            setIsOpen(false);
        }
    };
    
    const navItems = [
        { id: 'profile', label: 'User Profile', icon: <UserIcon className="w-5 h-5" /> },
        { id: 'vitals-dashboard', label: 'Vitals Dashboard', icon: <HeartPulseIcon className="w-5 h-5" /> },
        { id: 'smart-upload', label: 'Smart Upload', icon: <UploadCloudIcon className="w-5 h-5" /> },
        { id: 'symptom-selector', label: 'Symptom Selector', icon: <BodyScanIcon className="w-5 h-5" /> },
        { id: 'interpreter', label: 'Pathology Interpreter', icon: <BrainCircuitIcon className="w-5 h-5" /> },
        { id: 'dashboard', label: 'Report Dashboard', icon: <ChartBarIcon className="w-5 h-5" /> },
        { id: 'radiology-analyzer', label: 'Radiology AI Analyzer', icon: <ScanIcon className="w-5 h-5" /> },
        { id: 'ai-report', label: 'AI Health Report', icon: <StethoscopeIcon className="w-5 h-5" /> },
        { id: 'biohacking', label: 'Biohacking AI', icon: <SparklesIcon className="w-5 h-5" /> },
        { id: 'nutrition-tracker', label: 'Nutrition Tracker', icon: <ScaleIcon className="w-5 h-5" /> },
        { id: 'medication-tracker', label: 'Medication Tracker', icon: <PillIcon className="w-5 h-5" /> },
        { id: 'screening-tracker', label: 'Screening Tracker', icon: <CalendarDaysIcon className="w-5 h-5" /> },
        { id: 'child-health', label: 'Child Health Tracking', icon: <ChildIcon className="w-5 h-5" /> },
        { id: 'historical', label: 'Historical Dashboard', icon: <HistoryIcon className="w-5 h-5" /> },
        { id: 'fitcalc', label: 'FitCalc', icon: <DumbbellIcon className="w-5 h-5" /> },
        { id: 'macromaster', label: 'MacroMaster', icon: <MacroIcon className="w-5 h-5" /> },
        { id: 'directory', label: 'Test Directory', icon: <TestTubeIcon className="w-5 h-5" /> },
        { id: 'radiology-directory', label: 'Radiology Directory', icon: <RadiologyIcon className="w-5 h-5" /> },
        { id: 'learning', label: 'Learning Zone', icon: <BookOpenIcon className="w-5 h-5" /> },
    ];

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}></div>
            <aside className={`absolute md:relative flex-shrink-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col p-4 z-40 h-full transition-transform transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <BloodDropIcon className="w-8 h-8 text-red-500" />
                        <span className="ml-2 text-xl font-bold text-slate-800 dark:text-white">HealthPath</span>
                    </div>
                     <button onClick={() => setIsOpen(false)} className="md:hidden p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-1 space-y-2">
                    {navItems.map(item => (
                        <NavLink
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={currentView === item.id}
                            onClick={() => handleNavigation(item.id as View)}
                        />
                    ))}
                </nav>
                 <div className="mt-auto pt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    <p>&copy; {new Date().getFullYear()} HealthPath</p>
                    <p>Educational Use Only.</p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;