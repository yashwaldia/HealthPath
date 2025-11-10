import { Notification, NotificationType, Report, UserProfile, VitalRecord, Medication } from '../types';
import { VACCINATION_SCHEDULE, RECOMMENDED_SCREENINGS } from '../constants';
import { generateAiNotificationSuggestions } from './geminiService';

const NOTIFICATIONS_KEY = 'healthpath_notifications';

// --- Data Loading ---
const safeJsonParse = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return fallback;
        const parsed = JSON.parse(item);
        // Basic type validation
        if (Array.isArray(fallback) && !Array.isArray(parsed)) {
             return fallback;
        }
        if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback) && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
            return fallback;
        }
        return parsed;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return fallback;
    }
};

const loadData = () => {
    const profile = safeJsonParse<UserProfile>('healthpath_user_profile', {});
    const reports = safeJsonParse<Report[]>('healthpath_lab_reports', []);
    const vitals = safeJsonParse<VitalRecord[]>('healthpath_vitals_records', []);
    return { profile, reports, vitals };
};


// --- Rule-Based Notification Generators ---

const checkVitals = (vitals: VitalRecord[]): Notification[] => {
    const newNotifications: Notification[] = [];
    if (vitals.length < 3) return newNotifications;

    const recentVitals = vitals.slice(-3);
    
    // Rule: High BP trend
    const highBpCount = recentVitals.filter(v => v.bloodPressureSystolic && parseInt(v.bloodPressureSystolic, 10) > 140).length;
    if (highBpCount >= 2) {
        newNotifications.push({
            id: `vitals-bp-${new Date().toISOString()}`,
            type: 'Vitals',
            title: 'High Blood Pressure Trend',
            message: 'Your blood pressure seems higher than average for the past few days. Consider monitoring it closely.',
            timestamp: new Date().toISOString(),
            isRead: false,
            link: 'vitals-dashboard'
        });
    }
    
    // Rule: Poor Sleep Trend
    const poorSleepCount = recentVitals.filter(v => v.sleepHours && parseFloat(v.sleepHours) < 6).length;
    if (poorSleepCount >= 2) {
        newNotifications.push({
            id: `vitals-sleep-${new Date().toISOString()}`,
            type: 'Lifestyle',
            title: 'Poor Sleep Detected',
            message: 'Your sleep duration has been low recently. Try a relaxation routine before bed.',
            timestamp: new Date().toISOString(),
            isRead: false,
            link: 'vitals-dashboard'
        });
    }

    return newNotifications;
};

const checkScreeningReminders = (reports: Report[]): Notification[] => {
    // FIX: Add guard to prevent crash if no reports are found.
    if (reports.length === 0) return [];

    const newNotifications: Notification[] = [];
    const today = new Date();
    
    RECOMMENDED_SCREENINGS.forEach(screening => {
        // FIX: Add check for report.date before sorting to prevent crash on invalid data.
        const relevantReports = reports.filter(report => 
            report && report.date && Array.isArray(report.results) && report.results.some(result => 
                result && screening.relevantTests.some(keyword => 
                    result.testName.toLowerCase().includes(keyword)
                )
            )
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastReport = relevantReports[0];
        const lastDate = lastReport && lastReport.date ? new Date(lastReport.date) : null;
        
        let status: 'Due' | 'Overdue' | 'Upcoming' | 'Completed' = 'Due';
        
        if (lastDate && !isNaN(lastDate.getTime())) {
            const nextDueDate = new Date(lastDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + screening.intervalMonths);
            
            const oneMonthBefore = new Date(nextDueDate);
            oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

            if (nextDueDate < today) {
                status = 'Overdue';
            } else if (today >= oneMonthBefore) {
                status = 'Upcoming';
            } else {
                status = 'Completed';
            }
        }
        
        if (status === 'Upcoming' || status === 'Overdue' || status === 'Due') {
            newNotifications.push({
                id: `screening-${screening.id}`, // Stable ID
                type: 'Reminder',
                title: `${status} Screening`,
                message: `Your routine '${screening.name}' is ${status.toLowerCase()}. It's recommended every ${screening.intervalMonths} months.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: 'screening-tracker'
            });
        }
    });

    return newNotifications;
};

const checkVitalsTrackingReminder = (profile: UserProfile, vitals: VitalRecord[]): Notification[] => {
    if (!profile.vitalsReminderTime) return [];

    const [reminderHour] = profile.vitalsReminderTime.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if it's the reminder hour and if vitals haven't been logged today
    if (currentHour === reminderHour) {
        const todayStr = now.toISOString().split('T')[0];
        const hasLoggedToday = vitals.some(v => v.date.startsWith(todayStr));

        if (!hasLoggedToday) {
            return [{
                id: `vitals-reminder-${todayStr}`, // Stable ID for today
                type: 'Reminder',
                title: 'Track Your Vitals',
                message: `It's time to record your daily vitals. Consistency is key to tracking your health!`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: 'vitals-dashboard'
            }];
        }
    }
    
    return [];
};

const checkChildHealth = (profile: UserProfile): Notification[] => {
    const newNotifications: Notification[] = [];
    // FIX: Add robust checks to prevent crashes from malformed data.
    if (!profile.children || !Array.isArray(profile.children)) return newNotifications;

    profile.children.forEach(child => {
        if (!child || !child.dob) return;
        const birthDate = new Date(child.dob);
        if (isNaN(birthDate.getTime())) return; // Skip if date is invalid

        VACCINATION_SCHEDULE.forEach(vaccine => {
            const dueDate = new Date(birthDate.getTime() + vaccine.ageInWeeks * 7 * 24 * 60 * 60 * 1000);
            const daysUntilDue = (dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            // Safely access vaccinations object
            const isCompleted = child.vaccinations && child.vaccinations[vaccine.id] === 'Completed';

            if (!isCompleted && daysUntilDue > 0 && daysUntilDue <= 7) {
                newNotifications.push({
                    id: `child-${child.id}-vaccine-${vaccine.id}`,
                    type: 'Child Health',
                    title: 'Upcoming Vaccination',
                    message: `${child.name}'s ${vaccine.name} vaccine is due in ${Math.ceil(daysUntilDue)} days.`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    link: 'child-health'
                });
            }
        });
    });

    return newNotifications;
};

const checkMedicationReminders = (): Notification[] => {
    const medications = safeJsonParse<Medication[]>('healthpath_medications', []);
    if (medications.length === 0) return [];
    
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toDateString();

    const dueNowMeds: Medication[] = [];
    const missedEarlierMeds: Medication[] = [];

    const frequencyMap = {
        'Once a day': { slots: [9], count: 1 },
        'Twice a day': { slots: [9, 20], count: 2 },
        'Thrice a day': { slots: [9, 14, 20], count: 3 },
        'Four times a day': { slots: [8, 12, 16, 20], count: 4 },
    };

    medications.forEach(med => {
        const startDate = new Date(med.startDate);
        const duration = parseInt(med.durationDays, 10);
        if (isNaN(duration) || isNaN(startDate.getTime())) return;

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);
        if (now < startDate || now >= endDate) return; // Not an active medication course

        if (med.frequency === 'As needed' || med.frequency === 'Custom') return;

        const dosesTakenToday = med.dosesTaken.filter(d => new Date(d.timestamp).toDateString() === todayStr).length;
        const schedule = frequencyMap[med.frequency];
        
        if (!schedule || dosesTakenToday >= schedule.count) return;

        let dosesExpectedByNow = 0;
        let missedDose = false;
        
        for (const slotHour of schedule.slots) {
            if (currentHour >= slotHour) {
                dosesExpectedByNow++;
                // A dose is "missed" if it's more than 4 hours late
                if (currentHour >= slotHour + 4) {
                    missedDose = true;
                }
            }
        }

        if (dosesTakenToday < dosesExpectedByNow) {
            if (missedDose) {
                missedEarlierMeds.push(med);
            } else {
                dueNowMeds.push(med);
            }
        }
    });
    
    const newNotifications: Notification[] = [];
    
    // Create "Due Now" notification
    if (dueNowMeds.length > 0) {
        const message = dueNowMeds.length > 1
            ? `You have ${dueNowMeds.length} doses scheduled.`
            : `It’s time for your ${dueNowMeds[0].name} 💊.`;
            
        newNotifications.push({
            id: `med-due-${now.toISOString().split('T')[0]}`,
            type: 'Reminder',
            title: 'Time to take your medicines 💊',
            message: message,
            timestamp: now.toISOString(),
            isRead: false,
            link: 'medication-tracker'
        });
    }

    // Create "Missed Dose" notification
    if (missedEarlierMeds.length > 0) {
        const message = missedEarlierMeds.length > 1
            ? `You have ${missedEarlierMeds.length} missed medicines today. Please check your schedule.`
            : `You missed your ${missedEarlierMeds[0].name} dose 😔 Tap to mark or reschedule.`;

        newNotifications.push({
            id: `med-missed-${now.toISOString().split('T')[0]}`,
            type: 'Reminder',
            title: 'Oops! Missed Dose',
            message: message,
            timestamp: now.toISOString(),
            isRead: false,
            link: 'medication-tracker'
        });
    }

    return newNotifications;
};


// --- AI Notification Generator ---
const generateAiNotifications = async (profile: UserProfile, reports: Report[], vitals: VitalRecord[]): Promise<Notification[]> => {
    if (vitals.length < 2 && reports.length === 0) return [];
    
    const summary = `
      - Profile: Age ${profile.age || 'N/A'}, Gender ${profile.gender || 'N/A'}, Conditions: ${profile.conditions || 'None'}
      - Latest Vitals: ${vitals.slice(-1).map(v => `BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}, Sleep: ${v.sleepHours}hrs, Steps: ${v.steps}`).join(', ')}
      - Last Report Summary: ${reports[0]?.aiSummary || 'N/A'}
    `;

    try {
        const resultJson = await generateAiNotificationSuggestions(summary);
        const parsed = JSON.parse(resultJson);
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            return parsed.suggestions.map((s: any) => ({
                id: `ai-insight-${Date.now()}-${Math.random()}`,
                type: 'AI Insight',
                title: s.title,
                message: s.message,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: 'ai-report'
            }));
        }
    } catch (e) {
        console.error("Failed to generate AI notifications", e);
    }
    return [];
};

// --- Main Service Function ---
export const generateNotifications = async () => {
    const { profile, reports, vitals } = loadData();
    
    // Generate notifications from all sources
    const ruleBasedNotifications = [
        ...checkVitals(vitals),
        ...checkScreeningReminders(reports),
        ...checkChildHealth(profile),
        ...checkMedicationReminders(),
        ...checkVitalsTrackingReminder(profile, vitals),
    ];
    
    const aiNotifications = await generateAiNotifications(profile, reports, vitals);
    
    const allNewPotentialNotifications = [...ruleBasedNotifications, ...aiNotifications];

    // Load existing notifications and prevent duplicates
    const existingNotifications: Notification[] = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    const existingIds = new Set(existingNotifications.map(n => n.id));

    const uniqueNewNotifications = allNewPotentialNotifications.filter(n => !existingIds.has(n.id));
    
    if (uniqueNewNotifications.length > 0) {
        const updatedNotifications = [...uniqueNewNotifications, ...existingNotifications];
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
        // Dispatch event to notify UI components
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    }
};