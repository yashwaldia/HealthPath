import React, { useState, useEffect, useMemo } from 'react';
import { Report, RecommendedScreening } from '../types';
import { CalendarDaysIcon } from './Icons';
import { RECOMMENDED_SCREENINGS } from '../constants';

type ScreeningStatus = 'Due' | 'Overdue' | 'Upcoming' | 'Completed';

interface CalculatedScreening extends RecommendedScreening {
    status: ScreeningStatus;
    lastDate: string | null;
    nextDate: string;
}

const LAB_REPORTS_KEY = 'healthpath_lab_reports';

const ScreeningTracker: React.FC = () => {
    const [reminders, setReminders] = useState<CalculatedScreening[]>([]);
    
    useEffect(() => {
        let savedReports: Report[] = [];
        try {
            const rawData = localStorage.getItem(LAB_REPORTS_KEY);
            const parsed = rawData ? JSON.parse(rawData) : [];
            if (Array.isArray(parsed)) {
                savedReports = parsed;
            }
        } catch (e) {
            console.error("Failed to parse lab reports for screening:", e);
        }

        // FIX: Add guard to prevent crash if no reports are found.
        if (savedReports.length === 0) return;

        const calculated = RECOMMENDED_SCREENINGS.map(screening => {
            // FIX: Add check for report.date before sorting to prevent crash on invalid data.
            const relevantReports = savedReports.filter(report => 
                report && report.date && Array.isArray(report.results) && report.results.some(result => 
                    result && screening.relevantTests.some(keyword => 
                        result.testName.toLowerCase().includes(keyword)
                    )
                )
            ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastReport = relevantReports[0];
            const lastDate = lastReport && lastReport.date ? new Date(lastReport.date) : null;
            
            let status: ScreeningStatus = 'Due';
            let nextDateStr = 'Now';
            
            if (lastDate && !isNaN(lastDate.getTime())) {
                const nextDueDate = new Date(lastDate);
                nextDueDate.setMonth(nextDueDate.getMonth() + screening.intervalMonths);
                nextDateStr = nextDueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                const today = new Date();
                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(today.getMonth() + 3);

                if (nextDueDate < today) {
                    status = 'Overdue';
                } else if (nextDueDate <= threeMonthsFromNow) {
                    status = 'Upcoming';
                } else {
                    status = 'Completed';
                }
            }
            
            return {
                ...screening,
                status,
                lastDate: lastDate ? lastDate.toLocaleDateString() : null,
                nextDate: nextDateStr,
            };
        });
        
        setReminders(calculated);

    }, []);
    
    const statusConfig: Record<ScreeningStatus, { color: string, text: string }> = {
        Due: { color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300', text: 'Due' },
        Overdue: { color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300', text: 'Overdue' },
        Upcoming: { color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300', text: 'Upcoming' },
        Completed: { color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300', text: 'Up-to-date' },
    };
    
    const remindersByCategory = useMemo(() => {
        return reminders.reduce((acc, reminder) => {
            if (!acc[reminder.category]) {
                acc[reminder.category] = [];
            }
            acc[reminder.category].push(reminder);
            return acc;
        }, {} as Record<string, CalculatedScreening[]>);
    }, [reminders]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Preventive Screening Tracker</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Stay on top of your health with automated reminders for important checkups.</p>
            </div>
            
            {reminders.length === 0 ? (
                 <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Reports to Analyze</h3>
                    <p className="text-slate-500 mt-2">Add some lab reports to start tracking your screening schedule.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* FIX: Explicitly type the arguments in the map callback to resolve a TypeScript inference issue where `screenings` was being typed as `unknown`. */}
                    {Object.entries(remindersByCategory).map(([category, screenings]: [string, CalculatedScreening[]]) => (
                        <div key={category} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">{category} Health</h3>
                            <div className="space-y-4">
                                {screenings.map(screening => (
                                    <div key={screening.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="md:col-span-2">
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{screening.name}</p>
                                            <p className="text-xs text-slate-500">{screening.description}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Last Done</p>
                                            <p className="font-medium text-sm">{screening.lastDate || 'N/A'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-slate-500">Next Due</p>
                                            <div className={`mt-1 inline-block px-3 py-1 text-xs font-bold rounded-full ${statusConfig[screening.status].color}`}>
                                                {screening.status !== 'Completed' ? screening.status : ''} {screening.nextDate}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScreeningTracker;