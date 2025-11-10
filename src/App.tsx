

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TestDirectory from './components/TestDirectory';
import AiInterpreter from './components/AiInterpreter';
import Dashboard from './components/Dashboard';
import HistoricalDashboard from './components/HistoricalDashboard';
import LearningZone from './components/LearningZone';
import UserProfile from './components/UserProfile';
import FitCalc from './components/FitCalc';
import AiHealthReport from './components/AiHealthReport';
import Chatbot from './components/Chatbot';
import MacroMaster from './components/MacroMaster';
import ChildHealth from './components/ChildHealth';
import RadiologyTests from './components/RadiologyTests';
import RadiologyAnalyzer from './components/RadiologyAnalyzer';
import SmartUpload from './components/SmartUpload';
import VitalsDashboard from './components/VitalsDashboard';
import NutritionTracker from './components/NutritionTracker';
import MedicationTracker from './components/MedicationTracker';
import ScreeningTracker from './components/ScreeningTracker';
import SymptomSelector from './components/SymptomSelector';
import BiohackingDashboard from './components/BiohackingDashboard';
import { NotificationBell, NotificationPanel, useNotifications } from './components/Notifications';
import { generateNotifications } from './services/notificationService';
import { SunIcon, MoonIcon, MenuIcon } from './components/Icons';
// FIX: Import View and HandoffData from types.ts after moving them to resolve circular dependency.
import { DetectedFileInfo, View, HandoffData } from './types';

const App: React.FC = () => {
    const [view, setView] = useState<View>('biohacking');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [comparisonList, setComparisonList] = useState<string[]>([]);
    const [handoffData, setHandoffData] = useState<HandoffData | null>(null);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const { unreadCount, markAllAsRead } = useNotifications();


    useEffect(() => {
        const isDark = localStorage.getItem('isDarkMode') === 'true';
        setIsDarkMode(isDark);
        // Generate notifications on initial app load
        generateNotifications();
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('isDarkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('isDarkMode', 'false');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    const toggleTestInComparison = (testId: string) => {
        setComparisonList(prev => 
            prev.includes(testId) 
            ? prev.filter(id => id !== testId) 
            : [...prev, testId]
        );
    };
    
    const clearHandoffData = () => setHandoffData(null);

    const handleOpenNotifications = () => {
        setIsNotificationPanelOpen(true);
        markAllAsRead();
    };

    const renderView = () => {
        switch (view) {
            case 'directory':
                return <TestDirectory comparisonList={comparisonList} onToggleCompare={toggleTestInComparison} />;
            case 'smart-upload':
                return <SmartUpload setView={setView} setHandoffData={setHandoffData} />;
            case 'interpreter':
                return <AiInterpreter setView={setView} handoffData={handoffData} onHandoffConsumed={clearHandoffData} />;
            case 'dashboard':
                return <Dashboard />;
            case 'vitals-dashboard':
                return <VitalsDashboard />;
            case 'nutrition-tracker':
                return <NutritionTracker />;
            case 'medication-tracker':
                return <MedicationTracker />;
            case 'screening-tracker':
                return <ScreeningTracker />;
            case 'symptom-selector':
                return <SymptomSelector />;
            case 'biohacking':
                return <BiohackingDashboard setView={setView} />;
            case 'radiology-directory':
                return <RadiologyTests />;
            case 'radiology-analyzer':
                return <RadiologyAnalyzer handoffData={handoffData} onHandoffConsumed={clearHandoffData} />;
            case 'ai-report':
                return <AiHealthReport />;
            case 'child-health':
                return <ChildHealth />;
            case 'historical':
                return <HistoricalDashboard />;
            case 'learning':
                return <LearningZone initialCompareList={comparisonList} />;
            case 'profile':
                return <UserProfile />;
            case 'fitcalc':
                return <FitCalc />;
            case 'macromaster':
                return <MacroMaster />;
            default:
                return <SmartUpload setView={setView} setHandoffData={setHandoffData} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
            <Sidebar currentView={view} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 mr-4 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                           <MenuIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                            HealthPath <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">- AI Pathology Companion</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell count={unreadCount} onClick={handleOpenNotifications} />
                        <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            {isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}
                        </button>
                    </div>
                </header>
                <div key={view} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                    {renderView()}
                </div>
            </main>
            <NotificationPanel isOpen={isNotificationPanelOpen} onClose={() => setIsNotificationPanelOpen(false)} setView={setView} />
            <Chatbot />
        </div>
    );
};

export default App;