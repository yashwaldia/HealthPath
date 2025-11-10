import { TestCategory, PathologyTest, Vaccination, RadiologyTest, RadiologyCategory, RecommendedScreening } from './types';

export const PATHOLOGY_TESTS: PathologyTest[] = [
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    category: TestCategory.BLOOD,
    purpose: 'To evaluate overall health and detect a wide range of disorders, including anemia, infection, and leukemia.',
    detects: 'Counts of red blood cells, white blood cells, platelets, hemoglobin concentration, and hematocrit.',
    normalRange: 'Varies by age and gender. Adults: RBC 4.5-5.5 million/µL, WBC 4,000-11,000/µL, Platelets 150,000-450,000/µL.',
    sampleType: 'Whole blood',
    interpretationTips: 'Low RBC may indicate anemia. High WBC may suggest infection. Low platelets can lead to bleeding issues.',
    system: 'General Health'
  },
  {
    id: 'lft',
    name: 'Liver Function Tests (LFT)',
    category: TestCategory.BLOOD,
    purpose: 'To assess liver health and detect liver damage.',
    detects: 'Levels of enzymes and proteins like ALT, AST, ALP, Albumin, and Bilirubin.',
    normalRange: 'ALT: 7-56 U/L; AST: 10-40 U/L. Varies by lab.',
    sampleType: 'Serum (blood)',
    interpretationTips: 'Elevated ALT and AST can indicate liver inflammation or damage. Bilirubin levels help assess jaundice.',
    system: 'Liver'
  },
  {
    id: 'kft',
    name: 'Kidney Function Tests (KFT)',
    category: TestCategory.BLOOD,
    purpose: 'To evaluate how well the kidneys are working.',
    detects: 'Levels of substances like creatinine and blood urea nitrogen (BUN). Includes eGFR calculation.',
    normalRange: 'Creatinine: 0.6-1.2 mg/dL; BUN: 7-20 mg/dL. eGFR > 60 mL/min/1.73m² is generally normal.',
    sampleType: 'Serum (blood)',
    interpretationTips: 'High creatinine and BUN levels may indicate impaired kidney function.',
    system: 'Kidney'
  },
  {
    id: 'lipid',
    name: 'Lipid Profile',
    category: TestCategory.BLOOD,
    purpose: 'To assess the risk of cardiovascular diseases.',
    detects: 'Levels of Total Cholesterol, LDL (bad) Cholesterol, HDL (good) Cholesterol, and Triglycerides.',
    normalRange: 'Total Cholesterol < 200 mg/dL; LDL < 100 mg/dL; HDL > 60 mg/dL; Triglycerides < 150 mg/dL.',
    sampleType: 'Serum (blood), usually fasting',
    interpretationTips: 'High LDL and triglycerides increase heart disease risk, while high HDL is protective.',
    system: 'Cardiac'
  },
  {
    id: 'urine-re',
    name: 'Urine Routine Examination (RE)',
    category: TestCategory.URINE,
    purpose: 'A basic screening test to detect and manage a wide range of disorders, such as urinary tract infections, kidney disease, and diabetes.',
    detects: 'Physical appearance, chemical composition (pH, protein, glucose, ketones), and microscopic contents (cells, crystals, bacteria).',
    normalRange: 'Color: Yellow; Appearance: Clear; pH: 4.5-8.0; Protein, Glucose, Ketones, Nitrites: Negative.',
    sampleType: 'Urine',
    interpretationTips: 'Presence of glucose can suggest diabetes. Nitrites and WBCs point towards a UTI.',
    system: 'Kidney'
  },
  {
    id: 'stool-re',
    name: 'Stool Routine Examination',
    category: TestCategory.STOOL,
    purpose: 'To check for diseases of the digestive tract, including infection (bacteria, viruses, parasites), poor nutrient absorption, or cancer.',
    detects: 'Color, consistency, presence of mucus, blood, white blood cells, parasites, or undigested food.',
    normalRange: 'Brown, formed, no blood/mucus. Ova and parasites should be absent.',
    sampleType: 'Stool',
    interpretationTips: 'Occult blood can be a sign of colorectal cancer. Presence of specific parasites confirms infection.',
    system: 'Gastrointestinal'
  },
  {
    id: 'sputum-afb',
    name: 'Sputum for AFB',
    category: TestCategory.SPUTUM,
    purpose: 'To diagnose tuberculosis (TB) and other mycobacterial infections.',
    detects: 'Presence of Acid-Fast Bacilli (AFB), which are characteristic of Mycobacterium tuberculosis.',
    normalRange: 'Negative (No AFB seen).',
    sampleType: 'Sputum (deep cough sample)',
    interpretationTips: 'A positive smear is a strong indicator of active pulmonary tuberculosis.',
    system: 'Respiratory'
  },
  {
    id: 'csf-analysis',
    name: 'Cerebrospinal Fluid (CSF) Analysis',
    category: TestCategory.FLUID,
    purpose: 'To diagnose conditions affecting the brain and spinal cord, such as meningitis, encephalitis, and multiple sclerosis.',
    detects: 'CSF pressure, appearance, cell counts, protein, glucose, and presence of microorganisms.',
    normalRange: 'Appearance: Clear, colorless. WBC: 0-5 cells/µL. Protein: 15-45 mg/dL. Glucose: 50-80 mg/dL.',
    sampleType: 'Cerebrospinal Fluid (from lumbar puncture)',
    interpretationTips: 'High WBC count with low glucose suggests bacterial meningitis. Specific proteins can indicate MS.',
    system: 'Neurological'
  },
  {
    id: 'pap-smear',
    name: 'Pap Smear (Papanicolaou Test)',
    category: TestCategory.TISSUE,
    purpose: 'A screening procedure for cervical cancer.',
    detects: 'Presence of precancerous or cancerous cells on the cervix.',
    normalRange: 'Negative for intraepithelial lesion or malignancy (NILM).',
    sampleType: 'Cervical cells',
    interpretationTips: 'Abnormal results (e.g., ASC-US, LSIL, HSIL) require follow-up, but do not necessarily mean cancer.',
    system: 'Reproductive'
  },
  {
    id: 'bone-marrow-aspiration',
    name: 'Bone Marrow Aspiration & Biopsy',
    category: TestCategory.BONE_MARROW,
    purpose: 'To diagnose and monitor blood disorders like leukemia, lymphoma, multiple myeloma, and certain types of anemia.',
    detects: 'Cellularity of the marrow, ratio of different blood cell types, and presence of abnormal or cancerous cells.',
    normalRange: 'Varies widely; depends on detailed microscopic examination by a pathologist.',
    sampleType: 'Bone marrow fluid (aspirate) and tissue (biopsy)',
    interpretationTips: 'Provides a definitive diagnosis for many hematological malignancies. Cellularity and cell lineages are key parameters.',
    system: 'Hematological'
  },
];


export const VACCINATION_SCHEDULE: Vaccination[] = [
  { id: 'bcg_opv0_hepb1', name: 'BCG, OPV 0, Hep B 1', ageInWeeks: 0, ageDescription: 'Birth' },
  { id: 'dtp1_ipv1_hib1_hepb2', name: 'DTP 1, IPV 1, Hib 1, Hep B 2', ageInWeeks: 6, ageDescription: '6 Weeks' },
  { id: 'dtp2_ipv2_hib2', name: 'DTP 2, IPV 2, Hib 2', ageInWeeks: 10, ageDescription: '10 Weeks' },
  { id: 'dtp3_ipv3_hib3_rota3', name: 'DTP 3, IPV 3, Hib 3, Rota 3', ageInWeeks: 14, ageDescription: '14 Weeks' },
  { id: 'flu1', name: 'Influenza 1', ageInWeeks: 26, ageDescription: '6 Months' },
  { id: 'mmr1', name: 'Measles, MMR 1', ageInWeeks: 39, ageDescription: '9 Months' },
  { id: 'hib_booster_varicella1', name: 'Hib Booster, Varicella 1', ageInWeeks: 65, ageDescription: '12–15 Months' },
  { id: 'dtp_b1_ipv_b', name: 'DTP Booster 1, IPV Booster', ageInWeeks: 78, ageDescription: '1.5 Years' },
  { id: 'dtp_b2_mmr2_varicella2', name: 'DTP Booster 2, MMR 2, Varicella 2', ageInWeeks: 234, ageDescription: '4–6 Years' },
];

export const RADIOLOGY_TESTS: RadiologyTest[] = [
  // Basic
  { id: 'xray-chest', name: 'Chest X-Ray (PA / AP View)', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Lungs, heart, ribs, infections (like pneumonia, TB)' },
  { id: 'xray-abdomen', name: 'Abdomen X-Ray', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Intestinal blockage, stones, perforation' },
  { id: 'xray-skull', name: 'Skull X-Ray', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Head injury, sinus infection' },
  { id: 'xray-spine', name: 'Spine X-Ray (Cervical / Lumbar)', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Disc problems, fractures' },
  { id: 'xray-extremity', name: 'Extremity X-Ray (Arm / Leg)', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Bone fracture, joint dislocation' },
  { id: 'xray-dental', name: 'Dental X-Ray', category: RadiologyCategory.BASIC, subCategory: 'X-Ray (Radiograph)', purpose: 'Tooth decay, root infection' },
  // Intermediate - USG
  { id: 'usg-abdomen', name: 'Ultrasound Abdomen & Pelvis', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Liver, kidneys, gall bladder, uterus, ovaries' },
  { id: 'usg-kub', name: 'Ultrasound KUB', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Kidney, ureter, bladder stones' },
  { id: 'usg-thyroid', name: 'Ultrasound Thyroid', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Swelling, nodules' },
  { id: 'usg-obs', name: 'Obstetric Scan', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Pregnancy check & fetal growth' },
  { id: 'usg-doppler', name: 'Doppler Ultrasound', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Blood flow in arteries/veins' },
  { id: 'usg-breast', name: 'Breast Ultrasound', category: RadiologyCategory.INTERMEDIATE, subCategory: 'Ultrasound (USG)', purpose: 'Breast lumps or cysts' },
  // Intermediate - CT
  { id: 'ct-brain', name: 'CT Brain', category: RadiologyCategory.INTERMEDIATE, subCategory: 'CT Scan (Computed Tomography)', purpose: 'Stroke, bleeding, tumor' },
  { id: 'ct-chest', name: 'CT Chest', category: RadiologyCategory.INTERMEDIATE, subCategory: 'CT Scan (Computed Tomography)', purpose: 'Lung diseases, cancer detection' },
  { id: 'ct-abdomen', name: 'CT Abdomen & Pelvis', category: RadiologyCategory.INTERMEDIATE, subCategory: 'CT Scan (Computed Tomography)', purpose: 'Appendicitis, liver/spleen issues' },
  { id: 'ct-angio', name: 'CT Angiography', category: RadiologyCategory.INTERMEDIATE, subCategory: 'CT Scan (Computed Tomography)', purpose: 'Blood vessels & blockages' },
  { id: 'ct-spine', name: 'CT Spine', category: RadiologyCategory.INTERMEDIATE, subCategory: 'CT Scan (Computed Tomography)', purpose: 'Herniated disc, spinal injury' },
  // Advanced
  { id: 'mri-brain', name: 'MRI Brain', category: RadiologyCategory.ADVANCED, subCategory: 'MRI (Magnetic Resonance Imaging)', purpose: 'Tumors, stroke, multiple sclerosis' },
  { id: 'mri-spine', name: 'MRI Spine', category: RadiologyCategory.ADVANCED, subCategory: 'MRI (Magnetic Resonance Imaging)', purpose: 'Disc herniation, nerve compression' },
  { id: 'mri-joints', name: 'MRI Joints (Knee, Shoulder)', category: RadiologyCategory.ADVANCED, subCategory: 'MRI (Magnetic Resonance Imaging)', purpose: 'Ligament or cartilage injury' },
  { id: 'mri-abdomen', name: 'MRI Abdomen / Pelvis', category: RadiologyCategory.ADVANCED, subCategory: 'MRI (Magnetic Resonance Imaging)', purpose: 'Soft tissue evaluation' },
  { id: 'mri-angio', name: 'MRI Angiography', category: RadiologyCategory.ADVANCED, subCategory: 'MRI (Magnetic Resonance Imaging)', purpose: 'Brain and heart blood flow' },
  { id: 'mammo', name: 'Digital Mammography', category: RadiologyCategory.ADVANCED, subCategory: 'Mammography', purpose: 'Breast cancer screening (women above 40 years)' },
  { id: 'pet-ct', name: 'Whole Body PET-CT', category: RadiologyCategory.ADVANCED, subCategory: 'PET-CT Scan', purpose: 'Detects cancer spread, tumor recurrence' },
  { id: 'dexa', name: 'DEXA (Dual-Energy X-ray Absorptiometry)', category: RadiologyCategory.ADVANCED, subCategory: 'DEXA Scan (Bone Density Test)', purpose: 'Osteoporosis detection, bone strength' },
  { id: 'echo-2d', name: '2D ECHO', category: RadiologyCategory.ADVANCED, subCategory: 'Echocardiography (ECHO)', purpose: 'Heart pumping efficiency' },
  { id: 'echo-doppler', name: 'Color Doppler ECHO', category: RadiologyCategory.ADVANCED, subCategory: 'Echocardiography (ECHO)', purpose: 'Valve defects, blood flow' },
  { id: 'echo-stress', name: 'Stress ECHO', category: RadiologyCategory.ADVANCED, subCategory: 'Echocardiography (ECHO)', purpose: 'Detects blocked arteries during exertion' },
  // Specialized
  { id: 'hsg', name: 'HSG (Hysterosalpingography)', category: RadiologyCategory.SPECIALIZED, subCategory: 'Specialized Tests', purpose: 'Fallopian tube block (fertility)' },
  { id: 'ivp', name: 'IVP (Intravenous Pyelography)', category: RadiologyCategory.SPECIALIZED, subCategory: 'Specialized Tests', purpose: 'Kidney & urinary tract study' },
  { id: 'myelography', name: 'Myelography', category: RadiologyCategory.SPECIALIZED, subCategory: 'Specialized Tests', purpose: 'Spinal cord and nerve imaging' },
  { id: 'barium', name: 'Barium Swallow / Enema', category: RadiologyCategory.SPECIALIZED, subCategory: 'Specialized Tests', purpose: 'Esophagus or intestine blockage' },
  { id: 'sinogram', name: 'Sinogram / Fistulogram', category: RadiologyCategory.SPECIALIZED, subCategory: 'Specialized Tests', purpose: 'Sinus or fistula tract visualization' },
];

// FIX: Moved RECOMMENDED_SCREENINGS constant here from ScreeningTracker.tsx to be shared across the application.
export const RECOMMENDED_SCREENINGS: RecommendedScreening[] = [
    { id: 'lipid', name: 'Lipid Profile', category: 'Cardiac', intervalMonths: 12, relevantTests: ['lipid', 'cholesterol', 'triglycerides'], description: "Checks cholesterol levels to assess heart disease risk." },
    { id: 'hba1c', name: 'HbA1c', category: 'Diabetes', intervalMonths: 6, relevantTests: ['hba1c', 'glycated hemoglobin'], description: "Monitors long-term blood sugar control for diabetes management." },
    { id: 'fasting_sugar', name: 'Fasting Blood Sugar', category: 'Diabetes', intervalMonths: 6, relevantTests: ['fasting blood sugar', 'glucose, fasting'], description: "Screens for diabetes and pre-diabetes." },
    { id: 'vit_d', name: 'Vitamin D', category: 'Bone Health', intervalMonths: 12, relevantTests: ['vitamin d', '25-hydroxy'], description: "Essential for bone health and calcium absorption." },
    { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'General', intervalMonths: 12, relevantTests: ['complete blood count', 'cbc'], description: "Provides a broad overview of your general health and blood cell counts." },
    { id: 'lft', name: 'Liver Function Test (LFT)', category: 'General', intervalMonths: 12, relevantTests: ['liver function', 'lft', 'sgpt', 'sgot'], description: "Assesses the health of your liver." },
    { id: 'kft', name: 'Kidney Function Test (KFT)', category: 'General', intervalMonths: 12, relevantTests: ['kidney function', 'kft', 'creatinine', 'bun'], description: "Evaluates how well your kidneys are working." },
];