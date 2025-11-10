

// FIX: Moved View from App.tsx to types.ts to resolve circular dependency and export error.
export type View = 'directory' | 'interpreter' | 'dashboard' | 'historical' | 'learning' | 'profile' | 'fitcalc' | 'ai-report' | 'macromaster' | 'child-health' | 'radiology-directory' | 'radiology-analyzer' | 'smart-upload' | 'vitals-dashboard' | 'nutrition-tracker' | 'screening-tracker' | 'medication-tracker' | 'symptom-selector' | 'biohacking';

export enum TestCategory {
  BLOOD = 'Blood Tests',
  URINE = 'Urine Tests',
  STOOL = 'Stool Tests',
  SPUTUM = 'Sputum Tests',
  FLUID = 'Body Fluid Tests',
  TISSUE = 'Tissue & Cytology',
  BONE_MARROW = 'Bone Marrow & Histopathology',
}

export interface PathologyTest {
  id: string;
  name: string;
  category: TestCategory;
  purpose: string;
  detects: string;
  normalRange: string;
  sampleType: string;
  interpretationTips: string;
  system?: string; // e.g., Liver, Kidney, Cardiac
}

export enum RadiologyCategory {
  BASIC = 'Basic Radiology Tests',
  INTERMEDIATE = 'Intermediate Radiology Tests',
  ADVANCED = 'Advanced Radiology Tests',
  SPECIALIZED = 'Optional / Specialized Radiology',
}

export interface RadiologyTest {
  id: string;
  name: string;
  category: RadiologyCategory;
  subCategory: string;
  purpose: string;
}

export interface GrowthRecord {
  date: string; // ISO string date
  heightCm: string;
  weightKg: string;
}

export type VaccinationStatus = 'Completed' | 'Pending' | 'Upcoming' | 'Missed';

export interface Vaccination {
  id: string;
  name: string;
  ageInWeeks: number;
  ageDescription: string;
}

export interface Child {
  id: string; // uuid
  name: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female';
  birthWeightKg?: string;
  vaccinations: { [vaccineId: string]: 'Completed' | 'Missed' }; // key is vaccine id from constant
  growthRecords: GrowthRecord[];
}

export interface UserProfile {
  // Section 1: Basic Information
  fullName?: string;
  dob?: string; // Date of Birth
  age?: string; // Will be kept for simplicity, can be derived from DOB
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  height?: string; // in cm
  weight?: string; // in kg

  // Section 2: Medical Background
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  allergies?: string;
  conditions?: string; // Pre-existing conditions
  medications?: string;
  surgeryHistory?: string;
  familyHistory?: string;
  
  // Section 3: Lifestyle & Habits
  dietType?: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Keto' | 'Other';
  waterIntake?: string; // in L/day
  sleepDuration?: string; // in hrs/day
  smokingHabit?: 'Never' | 'Occasionally' | 'Regularly';
  alcoholConsumption?: 'None' | 'Occasionally' | 'Regularly';
  physicalActivity?: 'Sedentary' | 'Moderate' | 'Active';
  exerciseRoutine?: string;
  vitalsReminderTime?: string;
  
  // Section 4: Female Health
  lastMenstrualPeriod?: string; // Date of last menstrual period
  cycleLength?: string; // Average cycle length in days
  isPregnant?: 'Yes' | 'No' | 'Unknown';

  // Section 5: Child Health
  children?: Child[];
}

export interface TestResult {
  id: string; // unique id like uuid
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
}

export interface Report {
  id: string; // unique id for the report
  date: string; // ISO string date
  // FIX: Aligned `source` with `InputMode` type from AiInterpreter. Replaced 'pdf'|'image' with 'upload'.
  source: 'manual' | 'upload' | 'camera';
  results: TestResult[];
  aiSummary?: string;
}

export interface RadiologyReport {
  id: string; // unique id
  type: string; // e.g., 'X-Ray', 'CT', 'MRI'
  date: string; // ISO string date
  fileName: string;
  analysis: {
    summaryPoints: string[];
    keyFindings: string;
    comparisonToPrevious: string;
    recommendations: string;
  };
}

export interface DetectedFileInfo {
  category: 'Pathology' | 'Radiology' | 'Other';
  detectedName: string;
  detectedDate: string;
}

// FIX: Moved HandoffData from App.tsx to types.ts to resolve circular dependency.
export interface HandoffData {
  files: File[];
  metadata: DetectedFileInfo;
}

export interface VitalRecord {
  id: string; // uuid
  date: string; // ISO string date
  bloodPressureSystolic?: string;
  bloodPressureDiastolic?: string;
  bloodSugarFasting?: string;
  bloodSugarPostMeal?: string;
  weightKg?: string;
  temperature?: string;
  temperatureUnit?: '°C' | '°F';
  pulseRate?: string; // bpm
  oxygenSaturation?: string; // %
  respirationRate?: string; // breaths/min
  
  // New fields for wearables
  heartRate?: string; // bpm
  steps?: string;
  distanceKm?: string;
  sleepHours?: string;
  activeCalories?: string;
  totalCalories?: string;

  // New fields for biohacking
  hrv?: string; // Heart Rate Variability in ms
  readinessScore?: string; // 0-100
  stressLevel?: string; // 0-100
}

export interface FoodLogEntry {
  id: string;
  date: string; // ISO string date
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  image?: string; // base64 data URL
}

export interface MoodLogEntry {
  date: string; // ISO string date
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'awful';
}

// FIX: Moved RecommendedScreening interface here to be shared across the application.
export interface RecommendedScreening {
    id: string;
    name: string;
    category: 'Cardiac' | 'Diabetes' | 'Bone Health' | 'General';
    intervalMonths: number;
    relevantTests: string[]; // Keywords to search for in test names
    description: string;
}

export interface ScreeningReminder {
  id: string;
  name: string;
  category: string;
  status: 'Due' | 'Overdue' | 'Upcoming' | 'Completed';
  lastDate: string | null;
  nextDate: string;
}

export type NotificationType = 'Vitals' | 'AI Insight' | 'Reminder' | 'Lifestyle' | 'Child Health' | 'Radiology' | 'Message';

export interface Notification {
  id: string; // uuid
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO date string
  isRead: boolean;
  link: View; // The view to navigate to
}

export interface Dose {
  timestamp: string; // ISO date string when the dose was taken
}

export interface Medication {
  id: string; // uuid
  name: string;
  strength: string; // e.g., "500mg"
  dosageForm: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Other';
  frequency: 'Once a day' | 'Twice a day' | 'Thrice a day' | 'Four times a day' | 'As needed' | 'Custom';
  customFrequency?: string; // e.g., "Every 8 hours"
  mealRelation: 'Before meals' | 'After meals' | 'With meals' | 'Any time';
  startDate: string; // YYYY-MM-DD
  durationDays: string; // number as string
  endDate?: string; // YYYY-MM-DD, optional
  notes?: string;
  dosesTaken: Dose[];
  image?: string; // base64 data URL
  genericName?: string;
  classification?: string;
}