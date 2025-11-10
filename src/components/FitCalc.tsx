
import React, { useState, useEffect, useRef } from 'react';

// Type assertion for Chart.js from CDN
declare const Chart: any;

const FitCalc: React.FC = () => {
    const [activeTab, setActiveTab] = useState('bmi');
    const [inputs, setInputs] = useState<any>({});
    const [results, setResults] = useState<any>({});

    const chartRefs = {
        bmi: useRef<HTMLCanvasElement>(null),
        bmr: useRef<HTMLCanvasElement>(null),
        tdee: useRef<HTMLCanvasElement>(null),
        macros: useRef<HTMLCanvasElement>(null),
        hrzones: useRef<HTMLCanvasElement>(null),
    };
    const chartInstances = useRef<any>({});

    const handleInputChange = (calculator: string, field: string, value: string) => {
        setInputs((prev: any) => ({
            ...prev,
            [calculator]: {
                ...prev[calculator],
                [field]: value,
            }
        }));
    };
    
    const showResult = (calculator: string, newResult: any) => {
        setResults((prev: any) => ({
            ...prev,
            [calculator]: newResult
        }));
    };

    // --- CALCULATION LOGIC ---

    const calculateBmi = () => {
        const height = parseFloat(inputs.bmi?.height) / 100;
        const weight = parseFloat(inputs.bmi?.weight);
        if (!height || !weight) return;
        const bmi = weight / (height * height);
        let category, hint, categoryClass;
        if (bmi < 18.5) { category = 'Underweight'; hint = 'Consider consulting a healthcare provider...'; categoryClass = 'category-underweight'; } 
        else if (bmi < 25) { category = 'Normal weight'; hint = 'Maintain your healthy weight...'; categoryClass = 'category-normal'; } 
        else if (bmi < 30) { category = 'Overweight'; hint = 'Consider making lifestyle changes...'; categoryClass = 'category-overweight'; } 
        else { category = 'Obese'; hint = 'Consult with a healthcare provider...'; categoryClass = 'category-obese'; }
        showResult('bmi', { value: bmi.toFixed(1), category, hint, categoryClass });
    };

    const calculateBmr = () => {
        const { gender = 'male', age, height, weight, formula = 'mifflin' } = inputs.bmr || {};
        if (!age || !height || !weight) return;
        let bmr;
        if (formula === 'mifflin') {
            if (gender === 'male') bmr = 10 * weight + 6.25 * height - 5 * age + 5;
            else bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        } else {
            if (gender === 'male') bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
            else bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }
        showResult('bmr', { value: Math.round(bmr) });
        handleInputChange('tdee', 'bmr', Math.round(bmr).toString());
    };

    const calculateTdee = () => {
        const { bmr, activity = '1.2', goal = 'maintain' } = inputs.tdee || {};
        if (!bmr) return;
        const tdee = parseFloat(bmr) * parseFloat(activity);
        let target;
        if (goal === 'lose') target = tdee - 500;
        else if (goal === 'gain') target = tdee + 500;
        else target = tdee;
        showResult('tdee', { tdee: Math.round(tdee), target: Math.round(target) });
        handleInputChange('macros', 'calories', Math.round(target).toString());
    };
    
    const calculateMacros = () => {
      const { calories, preset = 'fatloss' } = inputs.macros || {};
      if (!calories) return;
      let ratios = { protein: 0.4, fat: 0.3, carbs: 0.3 };
      if (preset === 'recomp') ratios = { protein: 0.35, fat: 0.25, carbs: 0.4 };
      if (preset === 'musclegain') ratios = { protein: 0.3, fat: 0.25, carbs: 0.45 };
      const protein = Math.round((calories * ratios.protein) / 4);
      const fat = Math.round((calories * ratios.fat) / 9);
      const carbs = Math.round((calories * ratios.carbs) / 4);
      showResult('macros', { protein, fat, carbs, ratios });
    };
    
    const calculateOneRm = () => {
        const { weight, reps, formula = 'epley' } = inputs.onerm || {};
        if (!weight || !reps || reps > 10) return;
        let onerm;
        if (formula === 'epley') onerm = weight * (1 + reps / 30);
        else if (formula === 'brzycki') onerm = weight / (1.0278 - 0.0278 * reps);
        else onerm = weight * Math.pow(reps, 0.1);
        showResult('onerm', { value: Math.round(onerm) });
    };
    
    const calculateBodyFat = () => {
        const { gender = 'male', height, waist, neck, hip } = inputs.bodyfat || {};
        if (!height || !waist || !neck || (gender === 'female' && !hip)) return;
        let bodyfat;
        if (gender === 'male') {
            bodyfat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
        } else {
            bodyfat = 495 / (1.29579 - 0.35004 * Math.log10(parseFloat(waist) + parseFloat(hip) - neck) + 0.22100 * Math.log10(height)) - 450;
        }
        showResult('bodyfat', { value: bodyfat.toFixed(1) });
    };

    const calculateHrZones = () => {
        const { age, resting } = inputs.hrzones || {};
        if (!age) return;
        const maxHR = 208 - (0.7 * age);
        let zones = {};
        if (resting && resting > 0) {
            const hrReserve = maxHR - resting;
            zones = {
                zone1: `${Math.round(resting + hrReserve * 0.5)} - ${Math.round(resting + hrReserve * 0.6)} bpm`,
                zone2: `${Math.round(resting + hrReserve * 0.6)} - ${Math.round(resting + hrReserve * 0.7)} bpm`,
                zone3: `${Math.round(resting + hrReserve * 0.7)} - ${Math.round(resting + hrReserve * 0.8)} bpm`,
                zone4: `${Math.round(resting + hrReserve * 0.8)} - ${Math.round(resting + hrReserve * 0.9)} bpm`,
                zone5: `${Math.round(resting + hrReserve * 0.9)} - ${Math.round(maxHR)} bpm`,
            };
        } else {
            zones = {
                zone1: `${Math.round(maxHR * 0.5)} - ${Math.round(maxHR * 0.6)} bpm`,
                zone2: `${Math.round(maxHR * 0.6)} - ${Math.round(maxHR * 0.7)} bpm`,
                zone3: `${Math.round(maxHR * 0.7)} - ${Math.round(maxHR * 0.8)} bpm`,
                zone4: `${Math.round(maxHR * 0.8)} - ${Math.round(maxHR * 0.9)} bpm`,
                zone5: `${Math.round(maxHR * 0.9)} - ${Math.round(maxHR)} bpm`,
            };
        }
        showResult('hrzones', { ...zones, maxHR: Math.round(maxHR) });
    };

    const calculateVo2max = () => {
        const { time } = inputs.vo2max || {};
        if (!time || !time.includes(':')) return;
        const parts = time.split(':').map(Number);
        const totalMinutes = parts[0] + parts[1] / 60;
        const vo2max = 483 / totalMinutes + 3.5;
        showResult('vo2max', { value: vo2max.toFixed(1) });
    };
    
    const calculateActivity = () => {
        const { type = 'walking', duration, weight, intensity = 'light' } = inputs.activity || {};
        if (!duration || !weight) return;
        const metValues:any = { walking: { light: 3.5, moderate: 4.5, vigorous: 5.5 }, running: { light: 7, moderate: 10, vigorous: 12.5 }, cycling: { light: 6, moderate: 8, vigorous: 10 }, swimming: { light: 5, moderate: 7, vigorous: 9 }, weightlifting: { light: 3.5, moderate: 5, vigorous: 6 } };
        const met = metValues[type][intensity];
        const calories = met * weight * (duration / 60);
        showResult('activity', { value: Math.round(calories) });
    };

    const calculateRatios = () => {
        const { height, waist, hip } = inputs.ratios || {};
        if (!height || !waist || !hip) return;
        const whtr = waist / height;
        const whr = waist / hip;
        showResult('ratios', { whtr: whtr.toFixed(2), whr: whr.toFixed(2) });
    };
    
    const calculateIdealWeight = () => {
        const { gender = 'male', height } = inputs.idealweight || {};
        if (!height) return;
        const heightInches = height / 2.54;
        let devine, robinson, miller;
        if (gender === 'male') {
            devine = 50 + 2.3 * (heightInches - 60);
            robinson = 52 + 1.9 * (heightInches - 60);
            miller = 56.2 + 1.41 * (heightInches - 60);
        } else {
            devine = 45.5 + 2.3 * (heightInches - 60);
            robinson = 49 + 1.7 * (heightInches - 60);
            miller = 53.1 + 1.36 * (heightInches - 60);
        }
        showResult('idealweight', { devine: Math.round(devine), robinson: Math.round(robinson), miller: Math.round(miller) });
    };
    
    const calculateWater = () => {
        const { weight, activity = 'sedentary' } = inputs.water || {};
        if (!weight) return;
        let water = weight * 35;
        if (activity === 'lightly') water += 350;
        if (activity === 'moderately') water += 700;
        if (activity === 'very') water += 1050;
        showResult('water', { value: (water / 1000).toFixed(1) });
    };

    const calculateRunning = () => {
        const { distance, time } = inputs.running || {};
        if (!distance || !time || !time.includes(':')) return;
        const timeParts = time.split(':').map(Number);
        const totalMinutes = (timeParts.length === 3 ? timeParts[0]*60 : 0) + timeParts[timeParts.length - 2] + timeParts[timeParts.length - 1] / 60;
        const pace = totalMinutes / distance;
        const paceMinutes = Math.floor(pace);
        const paceSeconds = Math.round((pace - paceMinutes) * 60);
        const speed = distance / (totalMinutes / 60);
        showResult('running', { pace: `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`, speed: speed.toFixed(1) });
    };

    const calculateProtein = () => {
        const { weight, activity = 'sedentary', goal = 'maintain' } = inputs.protein || {};
        if (!weight) return;
        let proteinPerKg;
        switch(activity) {
            case 'sedentary': proteinPerKg = 0.8; break;
            case 'lightly': proteinPerKg = 1.0; break;
            case 'moderately': proteinPerKg = 1.2; break;
            case 'very': proteinPerKg = 1.6; break;
            case 'athlete': proteinPerKg = 2.0; break;
            default: proteinPerKg = 1.2;
        }
        if (goal === 'lose') proteinPerKg += 0.2;
        if (goal === 'gain') proteinPerKg += 0.4;
        showResult('protein', { value: Math.round(weight * proteinPerKg) });
    };

    
    useEffect(() => {
        if(results.macros?.ratios && chartInstances.current.macros) {
            chartInstances.current.macros.data.datasets[0].data = [
                results.macros.ratios.protein * 100,
                results.macros.ratios.fat * 100,
                results.macros.ratios.carbs * 100
            ];
            chartInstances.current.macros.update();
        }
    }, [results.macros]);


    useEffect(() => {
        // Chart initialization logic
        const chartConfigs: any = {
            bmi: { type: 'bar', data: { labels: ['Underweight', 'Normal', 'Overweight', 'Obese'], datasets: [{ label: 'BMI Ranges', data: [18.5, 24.9, 29.9, 40], backgroundColor: ['#ffeaa7', '#55efc4', '#fab1a0', '#ff7675'] }] }, options: { plugins: { legend: { display: false } } } },
            bmr: { type: 'doughnut', data: { labels: ['BMR', 'Activity', 'Thermic Effect of Food'], datasets: [{ data: [65, 25, 10], backgroundColor: ['#4361ee', '#4cc9f0', '#3a0ca3'] }] }},
            tdee: { type: 'bar', data: { labels: ['Sedentary', 'Lightly', 'Moderately', 'Very', 'Extremely'], datasets: [{ label: 'Activity Multiplier', data: [1.2, 1.375, 1.55, 1.725, 1.9], backgroundColor: '#4361ee' }] }},
            macros: { type: 'doughnut', data: { labels: ['Protein', 'Fat', 'Carbs'], datasets: [{ data: [40, 30, 30], backgroundColor: ['#4361ee', '#4cc9f0', '#3a0ca3'] }] }},
            hrzones: { type: 'pie', data: { labels: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'], datasets: [{ data: [10, 10, 10, 10, 10], backgroundColor: ['#4cc9f0', '#55efc4', '#ffeaa7', '#fab1a0', '#ff7675'] }] }},
        };
        
        Object.entries(chartRefs).forEach(([key, ref]) => {
            if (ref.current && !chartInstances.current[key]) {
                const config = chartConfigs[key];
                if (config) {
                   chartInstances.current[key] = new Chart(ref.current.getContext('2d'), config);
                }
            }
        });
        
        return () => {
            Object.values(chartInstances.current).forEach((chart: any) => chart.destroy());
            chartInstances.current = {};
        }
    }, []);

    const calculatorTabs = [
        { id: 'bmi', name: 'BMI' }, { id: 'bmr', name: 'BMR' }, { id: 'tdee', name: 'TDEE' },
        { id: 'macros', name: 'Macros' }, { id: 'onerm', name: '1RM' }, { id: 'bodyfat', name: 'Body Fat %' },
        { id: 'hrzones', name: 'HR Zones' }, { id: 'vo2max', name: 'VO₂max' }, { id: 'activity', name: 'Activity Calories' },
        { id: 'ratios', name: 'Ratios' }, { id: 'idealweight', name: 'Ideal Weight' }, { id: 'water', name: 'Water Intake' },
        { id: 'running', name: 'Running' }, { id: 'protein', name: 'Protein' },
    ];

    const renderCalculator = (id: string, children: React.ReactNode) => (
        <div className={`calculator-card ${activeTab === id ? 'active flex flex-col md:grid md:grid-cols-2 gap-6' : 'hidden'}`}>{children}</div>
    );

    const renderInputSection = (title: string, onCalculate: () => void, children: React.ReactNode, resultNode: React.ReactNode) => (
         <div className="input-section space-y-4">
            <h2 className="card-title text-xl font-bold">{title}</h2>
            {children}
            <button onClick={onCalculate} className="gradient-shift w-full">Calculate</button>
            {resultNode}
        </div>
    );

    const renderInfoSection = (title: string, description: string, children?: React.ReactNode, chartRef?: React.RefObject<HTMLCanvasElement>) => (
        <div className="info-section">
            <h3 className="info-title font-bold">About {title}</h3>
            <p>{description}</p>
            {children}
            {chartRef && <div className="h-48 mt-4"><canvas ref={chartRef}></canvas></div>}
        </div>
    );

    return (
        <div className="fitcalc-container">
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold">FitCalc</h1>
                <p className="text-slate-400">Comprehensive tools for health assessment and fitness planning.</p>
            </header>

            <div className="tabs flex flex-wrap gap-2 mb-4">
                {calculatorTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab ${activeTab === tab.id ? 'active' : ''}`}>{tab.name}</button>
                ))}
            </div>

            {renderCalculator('bmi', <>
                {renderInputSection('Body Mass Index (BMI)', calculateBmi, <>
                    <div><label>Height (cm)</label><input type="number" placeholder="Enter height" onChange={e => handleInputChange('bmi', 'height', e.target.value)} /></div>
                    <div><label>Weight (kg)</label><input type="number" placeholder="Enter weight" onChange={e => handleInputChange('bmi', 'weight', e.target.value)} /></div>
                </>, <div className={`result ${results.bmi ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your BMI</h3><div className="text-3xl font-bold">{results.bmi?.value}</div><div className={`result-category ${results.bmi?.categoryClass}`}>{results.bmi?.category}</div></div>)}
                {renderInfoSection('BMI', 'A measure of body fat based on your weight in relation to your height.', <div className="formula-box my-4"><h4 className="font-semibold">Formula</h4><div className="font-mono p-2 bg-slate-900/50 rounded mt-1">BMI = weight (kg) / [height (m)]²</div></div>, chartRefs.bmi)}
            </>)}
            
            {renderCalculator('bmr', <>
                {renderInputSection('Basal Metabolic Rate (BMR)', calculateBmr, <>
                    <div><label>Gender</label><select onChange={e => handleInputChange('bmr', 'gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></div>
                    <div><label>Age (years)</label><input type="number" placeholder="Enter age" onChange={e => handleInputChange('bmr', 'age', e.target.value)} /></div>
                    <div><label>Height (cm)</label><input type="number" placeholder="Enter height" onChange={e => handleInputChange('bmr', 'height', e.target.value)} /></div>
                    <div><label>Weight (kg)</label><input type="number" placeholder="Enter weight" onChange={e => handleInputChange('bmr', 'weight', e.target.value)} /></div>
                    <div><label>Formula</label><select onChange={e => handleInputChange('bmr', 'formula', e.target.value)}><option value="mifflin">Mifflin-St Jeor</option><option value="harris">Harris-Benedict</option></select></div>
                </>, <div className={`result ${results.bmr ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your BMR</h3><div className="text-3xl font-bold">{results.bmr?.value} kcal/day</div></div>)}
                {renderInfoSection('BMR', 'The number of calories your body needs to accomplish its most basic life-sustaining functions.', undefined, chartRefs.bmr)}
            </>)}

            {renderCalculator('tdee', <>
                {renderInputSection('Total Daily Energy Expenditure (TDEE)', calculateTdee, <>
                    <div><label>BMR (kcal/day)</label><input type="number" placeholder="Enter BMR" value={inputs.tdee?.bmr || ''} onChange={e => handleInputChange('tdee', 'bmr', e.target.value)} /></div>
                    <div><label>Activity Level</label><select defaultValue="1.2" onChange={e => handleInputChange('tdee', 'activity', e.target.value)}><option value="1.2">Sedentary</option><option value="1.375">Lightly active</option><option value="1.55">Moderately active</option><option value="1.725">Very active</option><option value="1.9">Extremely active</option></select></div>
                    <div><label>Goal</label><select onChange={e => handleInputChange('tdee', 'goal', e.target.value)}><option value="maintain">Maintain</option><option value="lose">Lose Weight</option><option value="gain">Gain Weight</option></select></div>
                </>, <div className={`result ${results.tdee ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your TDEE</h3><p>Maintenance: <span className="font-bold text-xl">{results.tdee?.tdee} kcal</span></p><p>Your Target: <span className="font-bold text-xl">{results.tdee?.target} kcal</span></p></div>)}
                {renderInfoSection('TDEE', 'An estimate of how many calories you burn per day when exercise is taken into account.', undefined, chartRefs.tdee)}
            </>)}

            {renderCalculator('macros', <>
                {renderInputSection('Macronutrients', calculateMacros, <>
                    <div><label>Daily Calories</label><input type="number" placeholder="Enter daily calorie target" value={inputs.macros?.calories || ''} onChange={e => handleInputChange('macros', 'calories', e.target.value)} /></div>
                    <div><label>Goal</label><select onChange={e => handleInputChange('macros', 'preset', e.target.value)}><option value="fatloss">Fat Loss</option><option value="recomp">Recomposition</option><option value="musclegain">Muscle Gain</option></select></div>
                </>, <div className={`result ${results.macros ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your Macros</h3><p>Protein: <span className="font-bold text-xl">{results.macros?.protein}g</span></p><p>Fat: <span className="font-bold text-xl">{results.macros?.fat}g</span></p><p>Carbs: <span className="font-bold text-xl">{results.macros?.carbs}g</span></p></div>)}
                {renderInfoSection('Macros', 'Protein, fats, and carbohydrates your body needs in large amounts.', undefined, chartRefs.macros)}
            </>)}

            {renderCalculator('onerm', <>
                {renderInputSection('One-Rep Max (1RM)', calculateOneRm, <>
                    <div><label>Weight Lifted (kg)</label><input type="number" placeholder="e.g., 80" onChange={e => handleInputChange('onerm', 'weight', e.target.value)} /></div>
                    <div><label>Repetitions (1-10)</label><input type="number" placeholder="e.g., 5" onChange={e => handleInputChange('onerm', 'reps', e.target.value)} /></div>
                    <div><label>Formula</label><select onChange={e => handleInputChange('onerm', 'formula', e.target.value)}><option value="epley">Epley</option><option value="brzycki">Brzycki</option><option value="lombardi">Lombardi</option></select></div>
                </>, <div className={`result ${results.onerm ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Estimated 1RM</h3><div className="text-3xl font-bold">{results.onerm?.value} kg</div></div>)}
                {renderInfoSection('1RM', 'The maximum amount of weight you can lift for one repetition.')}
            </>)}

            {renderCalculator('bodyfat', <>
                {renderInputSection('Body Fat %', calculateBodyFat, <>
                    <div><label>Gender</label><select onChange={e => handleInputChange('bodyfat', 'gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></div>
                    <div><label>Height (cm)</label><input type="number" onChange={e => handleInputChange('bodyfat', 'height', e.target.value)} /></div>
                    <div><label>Waist (cm)</label><input type="number" onChange={e => handleInputChange('bodyfat', 'waist', e.target.value)} /></div>
                    <div><label>Neck (cm)</label><input type="number" onChange={e => handleInputChange('bodyfat', 'neck', e.target.value)} /></div>
                    {inputs.bodyfat?.gender === 'female' && <div><label>Hip (cm)</label><input type="number" onChange={e => handleInputChange('bodyfat', 'hip', e.target.value)} /></div>}
                </>, <div className={`result ${results.bodyfat ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Estimated Body Fat</h3><div className="text-3xl font-bold">{results.bodyfat?.value}%</div></div>)}
                {renderInfoSection('Body Fat %', "The proportion of fat to total body weight (US Navy method).")}
            </>)}
            
            {renderCalculator('hrzones', <>
                {renderInputSection('Heart Rate Zones', calculateHrZones, <>
                    <div><label>Age (years)</label><input type="number" onChange={e => handleInputChange('hrzones', 'age', e.target.value)} /></div>
                    <div><label>Resting HR (bpm, optional)</label><input type="number" onChange={e => handleInputChange('hrzones', 'resting', e.target.value)} /></div>
                </>, <div className={`result ${results.hrzones ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your HR Zones</h3><p>Max HR: {results.hrzones?.maxHR} bpm</p>
                    <p>Zone 1 (50-60%): {results.hrzones?.zone1}</p><p>Zone 2 (60-70%): {results.hrzones?.zone2}</p>
                    <p>Zone 3 (70-80%): {results.hrzones?.zone3}</p><p>Zone 4 (80-90%): {results.hrzones?.zone4}</p>
                    <p>Zone 5 (90-100%): {results.hrzones?.zone5}</p></div>)}
                {renderInfoSection('HR Zones', 'Training at the right intensity for your fitness goals.', undefined, chartRefs.hrzones)}
            </>)}

            {renderCalculator('vo2max', <>
                {renderInputSection('VO₂max', calculateVo2max, <>
                    <div><label>1.5 Mile Run Time (mm:ss)</label><input type="text" placeholder="e.g., 12:30" onChange={e => handleInputChange('vo2max', 'time', e.target.value)} /></div>
                </>, <div className={`result ${results.vo2max ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Estimated VO₂max</h3><div className="text-3xl font-bold">{results.vo2max?.value} ml/kg/min</div></div>)}
                {renderInfoSection('VO₂max', 'The maximum rate of oxygen consumption during incremental exercise.')}
            </>)}

            {renderCalculator('activity', <>
                {renderInputSection('Activity Calories', calculateActivity, <>
                    <div><label>Activity Type</label><select onChange={e => handleInputChange('activity', 'type', e.target.value)}><option value="walking">Walking</option><option value="running">Running</option><option value="cycling">Cycling</option><option value="swimming">Swimming</option><option value="weightlifting">Weightlifting</option></select></div>
                    <div><label>Intensity</label><select onChange={e => handleInputChange('activity', 'intensity', e.target.value)}><option value="light">Light</option><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></div>
                    <div><label>Duration (minutes)</label><input type="number" onChange={e => handleInputChange('activity', 'duration', e.target.value)} /></div>
                    <div><label>Weight (kg)</label><input type="number" onChange={e => handleInputChange('activity', 'weight', e.target.value)} /></div>
                </>, <div className={`result ${results.activity ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Calories Burned</h3><div className="text-3xl font-bold">{results.activity?.value} kcal</div></div>)}
                {renderInfoSection('Activity Calories', 'Estimate calories burned based on activity, duration, and weight.')}
            </>)}

            {renderCalculator('ratios', <>
                {renderInputSection('Body Ratios', calculateRatios, <>
                    <div><label>Height (cm)</label><input type="number" onChange={e => handleInputChange('ratios', 'height', e.target.value)} /></div>
                    <div><label>Waist (cm)</label><input type="number" onChange={e => handleInputChange('ratios', 'waist', e.target.value)} /></div>
                    <div><label>Hip (cm)</label><input type="number" onChange={e => handleInputChange('ratios', 'hip', e.target.value)} /></div>
                </>, <div className={`result ${results.ratios ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your Ratios</h3><p>Waist-to-Height: <span className="font-bold text-xl">{results.ratios?.whtr}</span></p><p>Waist-to-Hip: <span className="font-bold text-xl">{results.ratios?.whr}</span></p></div>)}
                {renderInfoSection('Body Ratios', 'Indicators of health risks associated with fat distribution.')}
            </>)}

            {renderCalculator('idealweight', <>
                {renderInputSection('Ideal Weight', calculateIdealWeight, <>
                    <div><label>Gender</label><select onChange={e => handleInputChange('idealweight', 'gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></div>
                    <div><label>Height (cm)</label><input type="number" onChange={e => handleInputChange('idealweight', 'height', e.target.value)} /></div>
                </>, <div className={`result ${results.idealweight ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Ideal Weight Estimates</h3><p>Devine: {results.idealweight?.devine} kg</p><p>Robinson: {results.idealweight?.robinson} kg</p><p>Miller: {results.idealweight?.miller} kg</p></div>)}
                {renderInfoSection('Ideal Weight', 'Provides a healthy weight range based on height and gender.')}
            </>)}

            {renderCalculator('water', <>
                {renderInputSection('Water Intake', calculateWater, <>
                    <div><label>Weight (kg)</label><input type="number" onChange={e => handleInputChange('water', 'weight', e.target.value)} /></div>
                    <div><label>Activity Level</label><select onChange={e => handleInputChange('water', 'activity', e.target.value)}><option value="sedentary">Sedentary</option><option value="lightly">Lightly Active</option><option value="moderately">Moderately Active</option><option value="very">Very Active</option></select></div>
                </>, <div className={`result ${results.water ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Recommended Intake</h3><div className="text-3xl font-bold">{results.water?.value} Liters/day</div></div>)}
                {renderInfoSection('Water Intake', 'Proper hydration is essential for overall health.')}
            </>)}

            {renderCalculator('running', <>
                {renderInputSection('Running Pace', calculateRunning, <>
                    <div><label>Distance (km)</label><input type="number" onChange={e => handleInputChange('running', 'distance', e.target.value)} /></div>
                    <div><label>Time (hh:mm:ss)</label><input type="text" placeholder="e.g., 0:25:30" onChange={e => handleInputChange('running', 'time', e.target.value)} /></div>
                </>, <div className={`result ${results.running ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Your Pace & Speed</h3><p>Pace: <span className="font-bold text-xl">{results.running?.pace} min/km</span></p><p>Speed: <span className="font-bold text-xl">{results.running?.speed} km/h</span></p></div>)}
                {renderInfoSection('Running Pace', 'The time it takes to cover a specific distance.')}
            </>)}
            
            {renderCalculator('protein', <>
                {renderInputSection('Protein Intake', calculateProtein, <>
                    <div><label>Weight (kg)</label><input type="number" onChange={e => handleInputChange('protein', 'weight', e.target.value)} /></div>
                    <div><label>Activity Level</label><select onChange={e => handleInputChange('protein', 'activity', e.target.value)}><option value="sedentary">Sedentary</option><option value="lightly">Lightly Active</option><option value="moderately">Moderately Active</option><option value="very">Very Active</option><option value="athlete">Athlete</option></select></div>
                    <div><label>Goal</label><select onChange={e => handleInputChange('protein', 'goal', e.target.value)}><option value="maintain">Maintain</option><option value="lose">Fat Loss</option><option value="gain">Muscle Gain</option></select></div>
                </>, <div className={`result ${results.protein ? 'active' : ''} p-4 rounded-lg bg-slate-700/50`}><h3 className="font-bold">Recommended Intake</h3><div className="text-3xl font-bold">{results.protein?.value} g/day</div></div>)}
                {renderInfoSection('Protein Intake', 'Essential for muscle repair, growth, and many bodily functions.')}
            </>)}

        </div>
    );
};

export default FitCalc;
