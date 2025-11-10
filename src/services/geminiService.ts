import { GoogleGenAI, Type, Part } from "@google/genai";
import { PathologyTest, UserProfile, Report, RadiologyReport, VitalRecord, FoodLogEntry, Child, MoodLogEntry } from '../types';

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

if (!ai) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

// Helper to convert File object to a Gemini API Part
const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

export const analyzeSingleVitalTrend = async (
    metricName: string,
    unit: string,
    history: { date: string; value: number }[]
): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const dataSummary = history.map(h => `Date: ${new Date(h.date).toLocaleDateString()}, Value: ${h.value} ${unit}`).join('\n');

    const prompt = `
      You are a "Health Data Analyst AI" for the HealthPath app. Your goal is to provide a clear and concise analysis of a user's historical data for a single health metric.
      - Be educational and encouraging.
      - Focus on trends, consistency, and notable changes.
      - Do NOT provide a medical diagnosis.

      Metric to Analyze: ${metricName} (${unit})
      Historical Data (oldest to newest):
      ${dataSummary}

      Based on this data, generate a structured JSON output with the following keys:
      1. "trendSummary": A single sentence summarizing the overall trend (e.g., "Your resting heart rate has shown a slight downward trend, which is a positive sign.").
      2. "keyObservations": An array of 2-3 bullet points highlighting specific insights (e.g., "There was a notable spike on [Date].", "Your values have been very consistent over the last week.").
      3. "educationalTip": A short, actionable, non-medical tip related to improving or maintaining this metric (e.g., "To support a healthy resting heart rate, consider incorporating 5-10 minutes of daily mindfulness or meditation.").

      Return ONLY the JSON object, without any markdown formatting or explanatory text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        trendSummary: { type: Type.STRING },
                        keyObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        educationalTip: { type: Type.STRING }
                    },
                    required: ["trendSummary", "keyObservations", "educationalTip"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error(`Error analyzing ${metricName} trend:`, error);
        return JSON.stringify({ error: "Failed to generate AI analysis for this metric." });
    }
};

export const generateBiohackingPlan = async (
    profile: UserProfile,
    vitals: VitalRecord[],
    foodLog: FoodLogEntry[],
    moodLog: MoodLogEntry[]
): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    // FIX: Add data validation to prevent sending malformed or empty data which can cause API errors.
    const validVitals = vitals.filter(v => v && v.date && !isNaN(new Date(v.date).getTime()));
    const vitalsSummary = validVitals.slice(-3).map(v => `Date: ${new Date(v.date).toLocaleDateString()}, Sleep: ${v.sleepHours || 'N/A'}h, Steps: ${v.steps || 'N/A'}, HR: ${v.heartRate || 'N/A'}bpm, HRV: ${v.hrv || 'N/A'}ms, Readiness: ${v.readinessScore || 'N/A'}/100, Stress: ${v.stressLevel || 'N/A'}/100`).join('; ');

    const validFoodLog = foodLog.filter(f => f && f.name);
    const foodLogSummary = validFoodLog.slice(-3).map(f => `${f.name} (~${f.calories} kcal)`).join('; ');

    const validMoodLog = moodLog.filter(m => m && m.date && !isNaN(new Date(m.date).getTime()));
    const moodLogSummary = validMoodLog.slice(-3).map(m => `${m.mood} on ${new Date(m.date).toLocaleDateString()}`).join('; ');


    const dataSummary = `
      - User Profile: Age ${profile.age || 'N/A'}, Gender ${profile.gender || 'N/A'}, Activity Level: ${profile.physicalActivity || 'N/A'}.
      - Recent Vitals (last 3 days): ${vitalsSummary || 'No recent vitals.'}
      - Recent Nutrition (last 3 meals): ${foodLogSummary || 'No recent nutrition.'}
      - Recent Mood (last 3 days): ${moodLogSummary || 'No recent mood entries.'}
    `;

    const prompt = `
      You are a "Biohacking AI Coach" for the HealthPath app. Your goal is to provide a daily, personalized, and actionable health plan based on the user's data.
      - Be positive, concise, and scientific but easy to understand.
      - Connect your suggestions directly to the data provided. For example, if sleep is low, suggest a way to improve it.
      - The user's goal is health optimization.

      User Health Data Summary:
      ${dataSummary}

      Based on this data, generate a structured JSON output with the following keys. Return ONLY the JSON object.
      1. "summary": A single, friendly, and motivational summary sentence about the user's current status.
      2. "keyInsights": An array of exactly 3 distinct, personalized insights based on the data (e.g., "Your HRV has been trending up, indicating good recovery.").
      3. "recommendations": An array of exactly 2 actionable recommendations for better health (e.g., "Aim for a 15-minute walk after lunch to stabilize glucose levels.").
      4. "motivation": A short, powerful motivational quote related to health or consistency.
      5. "suggestedGraphs": An array of exactly 4 objects, each suggesting a metric to visualize. Each object must have "title" (e.g., "Sleep Consistency") and "metric" (one of: 'sleepHours', 'hrv', 'stressLevel', 'steps', 'activeCalories', 'heartRate'). Choose the most relevant metrics from the provided data.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: {
                            type: Type.STRING,
                            description: "A single, friendly, and motivational summary sentence."
                        },
                        keyInsights: {
                            type: Type.ARRAY,
                            description: "An array of exactly 3 short, personalized insights.",
                            items: { type: Type.STRING }
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            description: "An array of exactly 2 short, actionable recommendations.",
                            items: { type: Type.STRING }
                        },
                        motivation: {
                            type: Type.STRING,
                            description: "A short motivational quote."
                        },
                        suggestedGraphs: {
                            type: Type.ARRAY,
                            description: "An array of exactly 4 objects suggesting metrics to graph.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "A title for the graph, e.g., 'Sleep Consistency'." },
                                    metric: {
                                        type: Type.STRING,
                                        description: "The metric key to plot.",
                                        enum: ['sleepHours', 'hrv', 'stressLevel', 'steps', 'activeCalories', 'heartRate']
                                    }
                                },
                                required: ["title", "metric"]
                            }
                        }
                    },
                    required: ["summary", "keyInsights", "recommendations", "motivation", "suggestedGraphs"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating Biohacking Plan:", error);
        return JSON.stringify({ error: "Failed to generate AI plan. Please try again." });
    }
};


export const analyzeUploadedFileType = async (files: File[]): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are an intelligent medical document analysis and routing assistant for the HealthPath app.
      Your task is to analyze a batch of medical documents. You will be given multiple files at once. You MUST process each file independently. The classification for one file should not influence the classification of another.

      The output MUST be a JSON array of objects. The number of objects in the array must EXACTLY match the number of files you received. The order of objects in the array must correspond to the order of the files provided.

      For each file, perform the following steps:
      1.  **CLASSIFY THE DOCUMENT:** Determine its category based on these strict definitions:
          -   'Pathology': These are laboratory test reports. They primarily feature tables with rows for different tests (e.g., Hemoglobin, Glucose, Cholesterol), columns for results, units, and reference ranges. The source is usually a blood, urine, or tissue sample.
          -   'Radiology': These are medical imaging reports. They are primarily narrative (prose) descriptions of findings from scans like X-Rays, CT scans, MRIs, or Ultrasounds. They describe anatomical structures and findings like "no acute fracture" or "mild scoliosis". They DO NOT typically contain tables of numerical lab results.
          -   'Other': Use this for any document that does not clearly fit the definitions of 'Pathology' or 'Radiology'.

      2.  **EXTRACT METADATA:**
          -   'detectedName': Extract the specific name of the report (e.g., 'Complete Blood Count', 'Chest X-Ray PA View'). If no specific name is obvious, use a generic but descriptive name like 'Lab Report' or 'Imaging Report'.
          -   'detectedDate': Extract the date of the report in YYYY-MM-DD format. If no date is found, use today's date.

      Return ONLY the JSON array. Do not add any markdown formatting, introductory text, or explanations.
    `;

    try {
        const fileParts = await Promise.all(files.map(fileToGenerativePart));
        const contentParts: Part[] = [{ text: prompt }, ...fileParts];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    description: "An array of analysis results, one for each uploaded file, in the same order.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: {
                                type: Type.STRING,
                                description: "The type of document. Must be one of: 'Pathology', 'Radiology', 'Other'."
                            },
                            detectedName: {
                                type: Type.STRING,
                                description: "The specific name of the test or report found in the document."
                            },
                            detectedDate: {
                                type: Type.STRING,
                                description: `The date of the report in YYYY-MM-DD format. If not found, use today's date: ${new Date().toISOString().split('T')[0]}.`
                            }
                        },
                        required: ["category", "detectedName", "detectedDate"]
                    }
                }
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing file type:", error);
        return JSON.stringify([{ error: "Failed to analyze the document with AI. Please check the file and try again." }]);
    }
};


export const extractStructuredResults = async (files: File[]): Promise<string> => {
  if (!ai) {
    return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
  }

  const prompt = `
    Analyze the following lab report images/documents. Extract all pathology test names, their values, units, and normal ranges.
    Return the data as a structured JSON array. Each object in the array should represent a single test result and have the following fields: "testName", "value", "unit", "normalRange".
    If a piece of information isn't available, leave the string empty.
    Do not add any explanation, introductory text, or markdown formatting like \`\`\`json. Just return the raw JSON array.

    Example Output:
    [
      { "testName": "Hemoglobin", "value": "13.5", "unit": "g/dL", "normalRange": "12.0-16.0" },
      { "testName": "WBC Count", "value": "7500", "unit": "/µL", "normalRange": "4000-11000" }
    ]
  `;

  try {
    const imageParts = await Promise.all(files.map(fileToGenerativePart));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, ...imageParts] },
    });

    // Clean the response text to ensure it's valid JSON
    const text = response.text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch && jsonMatch[0]) {
        return jsonMatch[0];
    }
    return text;
  } catch (error) {
    console.error("Error extracting structured results:", error);
    return JSON.stringify({ error: "Failed to parse lab report with AI. Please check the file format." });
  }
};


export const interpretLabResults = async (results: string, referenceTests: PathologyTest[]): Promise<string> => {
  if (!ai) {
    return Promise.resolve("API Key is not configured. Cannot provide AI interpretation.");
  }

  const referenceData = referenceTests.map(test => 
    `- ${test.name}: Normal Range: ${test.normalRange}`
  ).join('\n');

  const prompt = `
    You are HealthPath, an AI pathology companion for educational purposes. Your role is to interpret lab results in a clear, simple, and non-diagnostic manner.

    **Disclaimer:** Start your response with this exact disclaimer, enclosed in a highlighted box:
    "***MEDICAL DISCLAIMER: This is an AI-generated interpretation for educational purposes only. It is NOT a medical diagnosis. Please consult a qualified healthcare professional for any health concerns.***"

    **Task:**
    Analyze the following lab report, comparing the values against the provided normal ranges. Provide a human-friendly summary.

    **Input Lab Report:**
    \`\`\`
    ${results}
    \`\`\`

    **Reference Normal Ranges (use these as a guide):**
    ${referenceData}

    **Output Format (use Markdown):**
    1.  **Overall Summary:** A brief, one or two-sentence summary (e.g., "Most of your results appear within the normal range, with a few exceptions noted below." or "The results indicate a potential for mild anemia.").
    2.  **Key Findings:** Create a bulleted list for any values that are outside the normal range. For each item, mention the test, its value, the normal range, and a simple educational note about what it might indicate (e.g., "- Hemoglobin: 10.5 g/dL (Normal: 12-16 g/dL). This is slightly low and can be associated with anemia.").
    3.  **Normal Findings:** Briefly mention that other results are within normal limits.
    4.  **Educational Next Steps:** Provide a few general, non-prescriptive suggestions (e.g., "Discussing these results with a doctor can provide more clarity." or "Maintaining a balanced diet is important for overall blood health.").

    **Important Rules:**
    - DO NOT provide a medical diagnosis.
    - DO NOT suggest specific treatments or medications.
    - Use simple, easy-to-understand language. Avoid overly technical jargon.
    - Be encouraging and supportive in your tone.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error interpreting lab results:", error);
    return "There was an error processing your request. Please try again. Ensure your API key is valid.";
  }
};

export const interpretLabResultsForProfile = async (
    input: { text?: string; files?: File[] }, 
    profile: UserProfile, 
    referenceTests: PathologyTest[]
): Promise<string> => {
  if (!ai) {
    return Promise.resolve("API Key is not configured. Cannot provide AI interpretation.");
  }

  const profileSummary = `
- Age: ${profile.age || 'Not provided'}
- Gender: ${profile.gender || 'Not provided'}
- Pre-existing Conditions: ${profile.conditions || 'None reported'}
- Current Medications: ${profile.medications || 'None reported'}
- Family Medical History: ${profile.familyHistory || 'None reported'}
  `.trim();

  const referenceData = referenceTests.map(test => 
    `- ${test.name}: Normal Range: ${test.normalRange}`
  ).join('\n');

  const prompt = `
    You are HealthPath, an AI pathology companion for educational purposes. Your role is to interpret lab results in a clear, simple, and non-diagnostic manner, personalizing the explanation based on the user's health profile. The lab results will be provided either as text or as images.

    **Disclaimer:** Start your response with this exact disclaimer, enclosed in a highlighted box:
    "***MEDICAL DISCLAIMER: This is an AI-generated interpretation for educational purposes only. It is NOT a medical diagnosis. Please consult a qualified healthcare professional for any health concerns.***"

    **User Health Profile (for context):**
    \`\`\`
    ${profileSummary}
    \`\`\`

    **Task:**
    Analyze the following lab report content (from text and/or images), comparing the values against the provided normal ranges. Provide a human-friendly summary, taking the user's health profile into account where relevant (e.g., mentioning how a result might relate to a reported condition).

    **Reference Normal Ranges (use these as a guide):**
    ${referenceData}

    **Output Format (use Markdown):**
    1.  **Overall Summary:** A brief, one or two-sentence summary.
    2.  **Key Findings:** A bulleted list for any values outside the normal range. For each, mention the test, its value, the normal range, and a simple educational note. If relevant, gently connect it to the user's profile context without making a diagnosis.
    3.  **Normal Findings:** Briefly mention that other results are within normal limits.
    4.  **Educational Next Steps:** Provide general, non-prescriptive suggestions.

    **Important Rules:**
    - DO NOT provide a medical diagnosis.
    - DO NOT suggest specific treatments or medications.
    - Use simple, easy-to-understand language.
    - Be encouraging and supportive.
    - If a user profile field is 'Not provided' or empty, do not mention it.
    `;

  try {
    const contentParts: Part[] = [{ text: prompt }];

    if (input.text) {
        contentParts.push({ text: `\n--- LAB REPORT TEXT ---\n${input.text}` });
    }
    if (input.files && input.files.length > 0) {
        const imageParts = await Promise.all(input.files.map(fileToGenerativePart));
        contentParts.push(...imageParts);
    }

    if (contentParts.length === 1) {
        return "No report data provided to interpret.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
    });
    return response.text;
  } catch (error) {
    console.error("Error interpreting lab results:", error);
    return "There was an error processing your request. Please try again. Ensure your API key is valid.";
  }
};

export const analyzeHistoricalReport = async (report: Report): Promise<string> => {
  if (!ai) {
    return Promise.resolve("API Key is not configured. Cannot provide AI analysis.");
  }

  const resultsText = report.results.map(r => 
    `- ${r.testName}: ${r.value} ${r.unit} (Normal Range: ${r.normalRange})`
  ).join('\n');

  const prompt = `
    You are HealthPath, an AI pathology companion for educational purposes.
    Analyze the following historical lab report from ${new Date(report.date).toLocaleDateString()}.

    **Disclaimer:** Start your response with this exact disclaimer, enclosed in a highlighted box:
    "***MEDICAL DISCLAIMER: This is an AI-generated analysis for educational purposes only. It is NOT a medical diagnosis. Please consult a qualified healthcare professional for any health concerns.***"

    **Task:**
    Review the lab results below and provide a clear, concise summary.

    **Report Data:**
    \`\`\`
    ${resultsText}
    \`\`\`

    **Output Format (use Markdown):**
    1.  **Report Summary:** A brief, one or two-sentence summary of the report's overall findings (e.g., "This report from ${new Date(report.date).toLocaleDateString()} shows that most results were within normal limits, with a note on elevated cholesterol.").
    2.  **Key Findings:** Create a bulleted list for any values that were outside the normal range. For each item, mention the test, its value, the normal range, and a simple educational note.
    3.  **Overall Status:** Conclude with a general statement about the report (e.g., "The findings in this report were generally stable.").

    **Important Rules:**
    - DO NOT provide a medical diagnosis or suggest treatments.
    - Use simple, easy-to-understand language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing historical report:", error);
    return "There was an error processing your request. Please try again.";
  }
};

export const generateAiHealthReportSummary = async (profile: UserProfile, latestReport: Report, previousReport: Report | null, latestRadiologyReport: RadiologyReport | null, vitals: VitalRecord[]): Promise<string> => {
    if (!ai) {
      return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const profileText = `
      - Name: ${profile.fullName || 'N/A'}
      - Age: ${profile.age || 'N/A'} | Gender: ${profile.gender || 'N/A'}
      - Height: ${profile.height || 'N/A'} cm | Weight: ${profile.weight || 'N/A'} kg
      - Conditions: ${profile.conditions || 'None'}
      - Activity: ${profile.physicalActivity || 'N/A'}
    `.trim();

    const femaleHealthText = profile.gender === 'Female' ? `
      - Last Menstrual Period: ${profile.lastMenstrualPeriod || 'N/A'}
      - Cycle Length: ${profile.cycleLength || 'N/A'} days
      - Is Pregnant: ${profile.isPregnant || 'Unknown'}
    ` : '';

    const childrenText = (profile.children || [])
        // FIX: Add a filter to prevent crashes on null/invalid child records.
        .filter(child => child && child.dob && !isNaN(new Date(child.dob).getTime()))
        .map(child => {
        const ageInMs = Date.now() - new Date(child.dob).getTime();
        const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
        const ageInMonths = Math.floor((ageInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
        const latestGrowth = child.growthRecords && child.growthRecords.length > 0 ? child.growthRecords[child.growthRecords.length - 1] : null;

        return `
          - Child Name: ${child.name}
            - Age: ${ageInYears} years, ${ageInMonths} months
            - Gender: ${child.gender}
            - Latest Growth: ${latestGrowth ? `Height ${latestGrowth.heightCm}cm, Weight ${latestGrowth.weightKg}kg` : 'No record'}
            - Vaccination Status: Note any upcoming or pending vaccinations.
        `.trim();
    }).join('\n');


    const latestReportText = latestReport.results.map(r => `${r.testName}: ${r.value} ${r.unit}`).join(', ');
    const previousReportText = previousReport ? previousReport.results.map(r => `${r.testName}: ${r.value} ${r.unit}`).join(', ') : 'No previous report available.';
    
    const latestRadiologyReportText = latestRadiologyReport ? `
      - Type: ${latestRadiologyReport.type}
      - Key Findings: ${latestRadiologyReport.analysis.keyFindings}
      - AI Summary Points: ${latestRadiologyReport.analysis.summaryPoints.join('; ')}
    `.trim() : 'No recent radiology report available.';
    
    const latestVitalsText = vitals.length > 0 ? `Latest Vitals: BP ${vitals[vitals.length - 1].bloodPressureSystolic}/${vitals[vitals.length - 1].bloodPressureDiastolic}, Sugar ${vitals[vitals.length - 1].bloodSugarFasting}, HR ${vitals[vitals.length - 1].heartRate}` : 'No recent vitals available.';

    const prompt = `
      As an AI health assistant, generate a comprehensive health report summary in JSON format.
      Analyze the provided user profile, children's profiles, latest lab report, previous lab report, latest radiology report, and recent vitals data.

      User Profile:
      ${profileText}
      ${femaleHealthText}

      Children's Profiles:
      ${childrenText || 'No children added.'}

      Latest Lab Report (Date: ${new Date(latestReport.date).toLocaleDateString()}):
      ${latestReportText}

      Previous Lab Report (Date: ${previousReport ? new Date(previousReport.date).toLocaleDateString() : 'N/A'}):
      ${previousReportText}
      
      Latest Radiology Report Analysis (Date: ${latestRadiologyReport ? new Date(latestRadiologyReport.date).toLocaleDateString() : 'N/A'}):
      ${latestRadiologyReportText}

      Recent Vitals Data:
      ${latestVitalsText}

      Based on all this information, generate a structured JSON output. Do not include any markdown or introductory text.
      The JSON should strictly follow the provided schema.
      For the historical comparison, compare key biomarkers between the latest and previous lab reports. Note the change and a status (e.g., 'Improved', 'Worsened', 'Stable').
      Add a "vitalsSummary" with 2-3 bullet points about recent vitals trends. Omit if no vitals.
      Add a "femaleHealthSummary" with 1-3 bullet points if the user is female. Omit if not applicable.
      Add a "childHealthSummaries" array. For each child, provide a summary of their growth, vaccination status, and a wellness tip. Omit if no children.
      Add a "radiologySummary" with 2-4 bullet points summarizing the key findings from the radiology report. Omit if not applicable.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiSummary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A high-level 3-4 bullet point summary of the most critical findings for the main user, integrating all available data." },
              vitalsSummary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Summary of recent vital signs trends. Omit if not applicable." },
              femaleHealthSummary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Summary of female-specific health data. Omit if not applicable." },
              childHealthSummaries: {
                type: Type.ARRAY,
                description: "Summaries for each child. Omit if no children.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    childName: { type: Type.STRING },
                    summary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Bullet points on growth, vaccinations, and a wellness tip for the child." }
                  }
                }
              },
              healthReportInsights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed bullet points about specific results from the latest lab report for the main user." },
              radiologySummary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A 2-4 bullet point summary of the latest radiology report's key findings. Omit if no radiology report was provided."
              },
              aiObservations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable, non-diagnostic suggestions for the main user based on all available data." },
              historicalComparison: {
                type: Type.ARRAY,
                description: "Comparison of key metrics between the latest and previous lab reports for the main user.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    metric: { type: Type.STRING },
                    change: { type: Type.STRING },
                    status: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      });
      return response.text;
    } catch (error) {
      console.error("Error generating AI health report summary:", error);
      return JSON.stringify({ error: "Failed to generate AI summary. Please try again." });
    }
};

export const analyzeRadiologyReport = async (
    files: File[],
    reportType: string,
    testDate: string,
    previousReportSummary?: string
): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are a specialized AI assistant for analyzing radiology reports, for educational purposes.
      Your task is to analyze the provided radiology image(s)/document(s) and return a structured JSON summary.
      
      Report Details:
      - Type: ${reportType}
      - Date of Test: ${testDate}
      - Previous Report Summary (for comparison): ${previousReportSummary || 'No previous report provided for comparison.'}

      **Task:**
      Analyze the provided file(s). Extract key information and structure it according to the JSON schema below.
      Be objective and focus on descriptive findings. Avoid making definitive diagnoses.
      If comparing, clearly state changes observed between the current and previous reports.
      
      Return ONLY the JSON object, without any markdown formatting or explanatory text.
    `;

    try {
        const fileParts = await Promise.all(files.map(fileToGenerativePart));
        const contentParts: Part[] = [{ text: prompt }, ...fileParts];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summaryPoints: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A bullet-point list of the most critical observations from the report."
                        },
                        keyFindings: {
                            type: Type.STRING,
                            description: "A detailed paragraph summarizing the significant findings, abnormalities, or notable normalities."
                        },
                        comparisonToPrevious: {
                            type: Type.STRING,
                            description: "A summary of changes compared to the previous report. State if it's a baseline study if no previous report was provided. Note stability, improvement, or progression of findings."
                        },
                        recommendations: {
                            type: Type.STRING,
                            description: "General, non-diagnostic educational recommendations or potential follow-up suggestions for discussion with a doctor (e.g., 'Clinical correlation is recommended')."
                        }
                    },
                    required: ["summaryPoints", "keyFindings", "comparisonToPrevious", "recommendations"]
                }
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Error analyzing radiology report:", error);
        return JSON.stringify({ error: "Failed to analyze radiology report with AI. The file might be corrupted or in an unsupported format." });
    }
};

export const analyzeVitalsTrends = async (records: VitalRecord[]): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are a health AI assistant. Analyze the following time-series data of a user's vital signs.
      The data is sorted from oldest to newest. Provide a concise summary of trends, improvements, or areas of concern.
      Also provide 1-2 simple, actionable, non-medical recommendations.

      Reference Ranges for Health Status & Analysis Guidelines:
      - Blood Pressure: Normal <120/80. Alert 120-139/80-89. Critical >=140/90.
      - Blood Sugar (Fasting): Normal 70-99 mg/dL. Alert 100-125. Critical >=126.
      - Pulse Rate / Heart Rate: Normal 60-100 bpm. Alert if outside this range.
      - Oxygen Saturation: Normal >=95%. Alert 92-94%. Critical <92%.
      - Weight: Analyze the trend (increase/decrease/stable) and its velocity.
      - Sleep: Normal is 7-9 hours. Analyze trends in duration, consistency (day-to-day variation), and quality. If 'readinessScore' or 'stressLevel' are available, use them as indicators of sleep quality (higher readiness and lower stress suggest better quality). For example, "Sleep has been inconsistent, varying by 3 hours night-to-night" or "Although sleep duration is good, a low readiness score suggests sleep quality could be improved."
      - Steps: A common goal is 8,000-10,000 steps/day. Note consistency and trends.
      - Active Calories: Analyze the trend of active calories burned. Note consistency, significant increases or decreases, and relate it to daily steps if available. For example, "Your active calorie burn has been consistently above 300 kcal this week, which is great."

      User Data (latest record is most recent):
      ${JSON.stringify(records, null, 2)}

      Return ONLY a JSON object with two keys: "observations" and "recommendations".
      - "observations": An array of strings, with each string being a key finding. For sleep, specifically comment on duration, consistency, and quality. For activity, comment on active calories burned and steps. For example, "Blood pressure is stable..." or "Sleep duration has been consistent around 8 hours, and your high readiness scores suggest good sleep quality." or "Active calorie burn has increased by 15% this week, aligning with your increased step count."
      - "recommendations": An array of 1-2 strings with general wellness tips (e.g., "Consider reducing caffeine intake to support blood pressure management.", "Your sleep has been inconsistent; try setting a consistent bedtime and wake-up time, even on weekends.").
      
      Example Output:
      {
        "observations": ["Blood pressure shows a slightly elevated trend over the past week.", "Sleep duration has been inconsistent, varying between 5 and 8 hours.", "Active calorie burn has been steady around 400 kcal per day."],
        "recommendations": ["Incorporate a 15-minute walk after meals.", "Suggest setting a consistent bedtime to improve sleep regularity."]
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        observations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "An array of strings, where each string is a summary point about a vital sign's trend."
                        },
                        recommendations: {
                           type: Type.ARRAY,
                           items: { type: Type.STRING },
                           description: "An array of 1-2 actionable, non-medical recommendations."
                        }
                    },
                    required: ["observations", "recommendations"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing vitals trends:", error);
        return JSON.stringify({ error: "Failed to generate AI summary for vitals." });
    }
};


export const compareVitalsTrends = async (
    records1: VitalRecord[], 
    range1: {start: string, end: string},
    records2: VitalRecord[],
    range2: {start: string, end: string}
): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
        You are a health AI assistant. Compare two sets of vital records from different time periods.
        
        Period 1 is from ${range1.start} to ${range1.end}. Data:
        ${JSON.stringify(records1, null, 2)}

        Period 2 is from ${range2.start} to ${range2.end}. Data:
        ${JSON.stringify(records2, null, 2)}

        Task:
        1. For Blood Pressure (Systolic/Diastolic), Blood Sugar (Fasting), and Pulse Rate, calculate the average for each period.
        2. For Weight, find the starting and ending weight in each period to determine the change.
        3. Summarize the changes between Period 1 and Period 2 in a bulleted list. 
        4. State the percentage change and the absolute change in averages. For weight, state the absolute change in kg.
        
        Return ONLY a JSON object with the key "comparisonSummary", which is an array of strings.
        
        Example Output:
        {
          "comparisonSummary": [
            "Blood Pressure improved by 6% (average changed from 125/82 to 118/78).",
            "Fasting Blood Sugar remained stable.",
            "Weight decreased by 1.2 kg in the recent period."
          ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        comparisonSummary: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "An array of strings, where each string is a summary of the comparison between the two periods for a vital."
                        }
                    },
                    required: ["comparisonSummary"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error comparing vitals trends:", error);
        return JSON.stringify({ error: "Failed to generate AI comparison for vitals." });
    }
};

export const analyzeSingleMealImage = async (file: File): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are an expert food nutritionist AI. Your task is to analyze the provided image of a meal and return a structured JSON object with your best estimates for its nutritional content.

      1.  **Analyze the Meal:** Identify the meal and estimate its nutritional values. Include calories, protein, carbs, fat, fiber, and key vitamins.
      2.  **Return JSON Only:** Your response must be ONLY the JSON object, without any markdown formatting or explanatory text.
    `;

    try {
        const imagePart = await fileToGenerativePart(file);
        
        const contents = {
            parts: [
                { text: prompt },
                imagePart,
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A descriptive name for the meal." },
                        calories: { type: Type.NUMBER, description: "Total estimated calories for the meal." },
                        protein: { type: Type.NUMBER, description: "Total estimated protein in grams for the meal." },
                        carbs: { type: Type.NUMBER, description: "Total estimated carbohydrates in grams for the meal." },
                        fat: { type: Type.NUMBER, description: "Total estimated fat in grams for the meal." },
                        fiber: { type: Type.NUMBER, description: "Total estimated fiber in grams for the meal." },
                        vitamins: { type: Type.STRING, description: "Key vitamins found in the meal, as a comma-separated string." }
                    },
                    required: ["name", "calories", "protein", "carbs", "fat", "fiber", "vitamins"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing single meal image:", error);
        return JSON.stringify({ error: "Failed to analyze the meal image with AI." });
    }
};

export const compareMealImages = async (file1: File, file2: File): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are an expert food nutritionist AI. Your task is to analyze the two provided images of meals side-by-side and return a structured JSON object with your best estimates for their nutritional content and a comparative summary.

      1.  **Analyze Meal 1 & Meal 2:** For each meal, identify it and estimate its nutritional values. Include calories, protein, carbs, fat, fiber, and key vitamins.
      2.  **Compare and Summarize:** Write a summary explaining which meal is healthier and why, based on the nutritional analysis.
      3.  **Return JSON Only:** Your response must be ONLY the JSON object, without any markdown formatting or explanatory text.
    `;

    try {
        const imagePart1 = await fileToGenerativePart(file1);
        const imagePart2 = await fileToGenerativePart(file2);
        
        const contents = {
            parts: [
                { text: prompt },
                { text: "\n--- MEAL 1 ---" },
                imagePart1,
                { text: "\n--- MEAL 2 ---" },
                imagePart2
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        meal1: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "A descriptive name for Meal 1." },
                                calories: { type: Type.NUMBER, description: "Total estimated calories for Meal 1." },
                                protein: { type: Type.NUMBER, description: "Total estimated protein in grams for Meal 1." },
                                carbs: { type: Type.NUMBER, description: "Total estimated carbohydrates in grams for Meal 1." },
                                fat: { type: Type.NUMBER, description: "Total estimated fat in grams for Meal 1." },
                                fiber: { type: Type.NUMBER, description: "Total estimated fiber in grams for Meal 1." },
                                vitamins: { type: Type.STRING, description: "Key vitamins found in Meal 1, as a comma-separated string." }
                            },
                            required: ["name", "calories", "protein", "carbs", "fat", "fiber", "vitamins"]
                        },
                        meal2: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "A descriptive name for Meal 2." },
                                calories: { type: Type.NUMBER, description: "Total estimated calories for Meal 2." },
                                protein: { type: Type.NUMBER, description: "Total estimated protein in grams for Meal 2." },
                                carbs: { type: Type.NUMBER, description: "Total estimated carbohydrates in grams for Meal 2." },
                                fat: { type: Type.NUMBER, description: "Total estimated fat in grams for Meal 2." },
                                fiber: { type: Type.NUMBER, description: "Total estimated fiber in grams for Meal 2." },
                                vitamins: { type: Type.STRING, description: "Key vitamins found in Meal 2, as a comma-separated string." }
                            },
                             required: ["name", "calories", "protein", "carbs", "fat", "fiber", "vitamins"]
                        },
                        summary: {
                            type: Type.STRING,
                            description: "A summary comparing the two meals, explaining which is healthier and why, based on nutritional content."
                        }
                    },
                    required: ["meal1", "meal2", "summary"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error comparing meal images:", error);
        return JSON.stringify({ error: "Failed to analyze and compare the meal images with AI." });
    }
};

export const predictNutrientDeficiencies = async (foodLog: FoodLogEntry[], reports: Report[]): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const foodLogSummary = foodLog.slice(-10).map(entry => `- ${entry.name} (~${entry.calories} kcal, P:${entry.protein}g, C:${entry.carbs}g, F:${entry.fat}g)`).join('\n');
    const labResultsSummary = reports.slice(0, 2).map(report =>
        `Report from ${new Date(report.date).toLocaleDateString()}: ` +
        report.results.filter(r => ['Iron', 'Hemoglobin', 'Vitamin D', 'Vitamin B12', 'Sodium', 'Potassium'].some(keyword => r.testName.includes(keyword)))
        .map(r => `${r.testName}: ${r.value} (Range: ${r.normalRange})`)
        .join(', ')
    ).join('\n');

    const prompt = `
      You are an AI wellness advisor for the HealthPath app. Your task is to analyze a user's food log and recent blood reports to identify potential nutrient deficiencies or excesses. This is for educational purposes only and is not a medical diagnosis.

      User's Food Log (summary of recent meals):
      ${foodLogSummary || 'No food log entries provided.'}

      User's Recent Lab Results (key values):
      ${labResultsSummary || 'No relevant lab results provided.'}

      Based on this data, provide a structured JSON response.
      1.  **Predictions:** A list of potential nutrient gaps or excesses (e.g., "Potential for low Iron intake", "Sodium intake appears high"). Base this on common knowledge about the foods in the log and any related lab results (e.g., low Hemoglobin + low iron food intake -> suggest low iron).
      2.  **Recommendations:** A list of simple, actionable, non-medical dietary suggestions (e.g., "Consider incorporating more leafy greens like spinach for iron.", "Look for low-sodium versions of processed foods.").

      Return ONLY the JSON object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        predictions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of potential nutrient gaps or excesses." },
                        recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of actionable, non-medical dietary suggestions." }
                    },
                    required: ["predictions", "recommendations"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error predicting nutrient deficiencies:", error);
        return JSON.stringify({ error: "Failed to generate AI nutritional analysis." });
    }
};

export const generateAiNotificationSuggestions = async (healthDataSummary: string): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ suggestions: [] }));
    }

    const prompt = `
      You are an AI health assistant for the HealthPath app. Your task is to generate 2-3 smart, context-aware, and actionable notifications based on a user's health data summary.
      
      - Be insightful but NOT alarming.
      - Focus on positive reinforcement or gentle reminders.
      - Keep messages concise and clear.
      - Do NOT provide medical diagnoses.
      
      Health Data Summary:
      \`\`\`
      ${healthDataSummary}
      \`\`\`
      
      Return ONLY a JSON object with a single key "suggestions", which is an array of notification objects. Each object must have "title" and "message".
      
      Example Titles: "AI Health Insight", "Lifestyle Suggestion", "Wellness Tip".
      Example Messages: "Your average heart rate has decreased this week. Great job staying consistent with your walks!", "We've noticed your sleep duration has been shorter recently. Aiming for an earlier bedtime could help.", "Your recent blood sugar readings after meals have been stable. Your dietary choices seem to be paying off."
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: "An array of 2-3 notification suggestion objects.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "The title for the notification (e.g., 'AI Health Insight')." },
                                    message: { type: Type.STRING, description: "The concise notification message." }
                                },
                                required: ["title", "message"]
                            }
                        }
                    },
                    required: ["suggestions"]
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating AI notification suggestions:", error);
        return JSON.stringify({ suggestions: [] });
    }
};

export const analyzeChildHealthData = async (child: Child): Promise<string> => {
  if (!ai) {
    return Promise.resolve("API Key is not configured.");
  }
  
  // FIX: Add robust check for child.dob to prevent crash
  const dobDate = child.dob ? new Date(child.dob) : null;
  const ageInMs = (dobDate && !isNaN(dobDate.getTime())) ? Date.now() - dobDate.getTime() : 0;
  const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
  const ageInMonths = Math.floor((ageInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

  const growthData = (child.growthRecords || [])
    .filter(Boolean) // FIX: Filter out null/undefined records
    .map(r => {
        const recordDate = r.date ? new Date(r.date) : null;
        if (!recordDate || isNaN(recordDate.getTime())) return ''; // Skip invalid records
        return `- On ${recordDate.toLocaleDateString()}: Height ${r.heightCm || 'N/A'} cm, Weight ${r.weightKg || 'N/A'} kg`;
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `
    You are HealthPath, an AI assistant providing educational insights on child development based on user-provided data. This is NOT a medical diagnosis.

    **Disclaimer:** Start your response with this exact disclaimer:
    "***MEDICAL DISCLAIMER: This is an AI-generated analysis for educational purposes only. It is NOT a substitute for professional medical advice. Always consult a pediatrician for any health concerns regarding your child.***"

    **Child's Profile:**
    - Name: ${child.name}
    - Age: ${ageInYears} years, ${ageInMonths} months
    - Gender: ${child.gender}
    - Birth Weight: ${child.birthWeightKg || 'N/A'} kg

    **Growth Records (most recent is last):**
    ${growthData || "No growth records available."}

    **Vaccination Status:**
    ${JSON.stringify(child.vaccinations, null, 2)}

    **Task:**
    Analyze the provided data and generate a summary in Markdown format.
    1.  **Growth Summary:** Briefly comment on the growth trend. Note if the progression seems steady based on the provided points. Do not use specific percentiles unless you can calculate them, but comment on the overall trend (e.g., "steady increase in height and weight").
    2.  **Vaccination Adherence:** Review the vaccination status. Mention any upcoming or potentially missed vaccinations based on a standard schedule (e.g., a vaccine typically given at 6 months might be pending if the child is older).
    3.  **Age-Appropriate Wellness Tips:** Provide 2-3 general, non-medical wellness or developmental tips appropriate for a child of this age (e.g., for a 2-year-old, "Encourage talking in short sentences and exploring different textures during playtime.").

    **Important Rules:**
    - DO NOT diagnose any condition (e.g., "failure to thrive", "obesity").
    - Use supportive and general language (e.g., "It might be helpful to discuss this with your pediatrician" instead of "The child is underweight").
    - Keep tips general and safe.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing child health data:", error);
    return "There was an error generating the AI analysis for your child. Please try again.";
  }
};

export const extractMedicationDetailsFromImage = async (file: File): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are an intelligent medical Optical Character Recognition (OCR) assistant. Your task is to analyze the provided image of a medication's packaging (like a pill strip or box).

      1.  **Extract Key Details:** Identify and extract the following information:
          -   'name': The primary brand or generic name of the drug (e.g., 'Dolo', 'Paracetamol').
          -   'strength': The dosage strength of the medication (e.g., '650 mg', '500mg').
          -   'dosageForm': The form of the medication. It must be one of the following values: 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'. If you are unsure, select 'Tablet' or 'Other'.

      2.  **Return JSON Only:** Your response must be ONLY a single JSON object containing these fields. If a piece of information isn't available, return an empty string for that field. Do not include any markdown formatting, introductory text, or explanations.

      Example output:
      {
        "name": "Dolo",
        "strength": "650 mg",
        "dosageForm": "Tablet"
      }
    `;

    try {
        const imagePart = await fileToGenerativePart(file);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: "The brand or generic name of the medication.",
                        },
                        strength: {
                            type: Type.STRING,
                            description: "The dosage strength, including units (e.g., '500mg').",
                        },
                        dosageForm: {
                            type: Type.STRING,
                            description: "The form of the medication.",
                            enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'],
                        },
                    },
                    required: ["name", "strength", "dosageForm"],
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting medication details from image:", error);
        return JSON.stringify({ error: "Failed to analyze the medication image with AI." });
    }
};

export const extractMedicationsFromInput = async (input: { text?: string; files?: File[] }): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are a specialized medical AI assistant. Analyze the provided prescription image, photo of medicine packaging, or text. Your task is to extract details for ALL medications found and return them as a structured JSON array.

      For each medication, extract the following:
      1.  'name': The primary brand or generic name (e.g., 'Dolo 650', 'Pantop 40').
      2.  'strength': The dosage strength (e.g., '650 mg', '40 mg').
      3.  'dosageForm': The form of the medication. Must be one of: 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'.
      4.  'frequency': How often the medication is taken. Infer from timing. Must be one of: 'Once a day', 'Twice a day', 'Thrice a day', 'Four times a day', 'As needed', 'Custom'. For timings like "Morning, Afternoon, Night", infer 'Thrice a day'. For "Morning", infer 'Once a day'.
      5.  'mealRelation': The instruction regarding food. Must be one of: 'Before meals', 'After meals', 'With meals', 'Any time'.

      Return ONLY the JSON array. Do not add any markdown, introductory text, or explanations. If you cannot find any medication, return an empty array [].
    `;

    try {
        const contentParts: Part[] = [{ text: prompt }];

        if (input.text) {
            contentParts.push({ text: `\n--- PRESCRIPTION TEXT ---\n${input.text}` });
        }
        if (input.files && input.files.length > 0) {
            const fileParts = await Promise.all(input.files.map(fileToGenerativePart));
            contentParts.push(...fileParts);
        }
    
        if (contentParts.length === 1) {
            return JSON.stringify({ error: "No input provided." });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    description: "An array of medication objects extracted from the input.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: {
                                type: Type.STRING,
                                description: "The brand or generic name of the medication.",
                            },
                            strength: {
                                type: Type.STRING,
                                description: "The dosage strength, including units (e.g., '500mg').",
                            },
                            dosageForm: {
                                type: Type.STRING,
                                description: "The form of the medication.",
                                enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Other'],
                            },
                            frequency: {
                                type: Type.STRING,
                                description: "How often the medication should be taken.",
                                enum: ['Once a day', 'Twice a day', 'Thrice a day', 'Four times a day', 'As needed', 'Custom'],
                            },
                            mealRelation: {
                                type: Type.STRING,
                                description: "Instructions regarding food.",
                                enum: ['Before meals', 'After meals', 'With meals', 'Any time'],
                            },
                        },
                        required: ["name", "strength", "dosageForm", "frequency", "mealRelation"],
                    }
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting medication details:", error);
        return JSON.stringify({ error: `Rpc failed due to xhr error. uri: https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ProxyUnaryCall, error code: 6, error:  [0]` });
    }
};

export const classifyMedications = async (medicationNames: string[]): Promise<string> => {
    if (!ai) {
        return Promise.resolve(JSON.stringify({ error: "API Key is not configured." }));
    }

    const prompt = `
      You are a specialized medical AI assistant with expertise in pharmacology.
      Your task is to analyze a list of medication names and provide their generic (chemical) name and their primary pharmacological classification.

      For each drug name in the provided list, return:
      1.  'originalName': The exact name provided in the input list.
      2.  'genericName': The common generic or chemical name for the drug. For combination drugs, list the primary active ingredients. (e.g., for 'Dolo 650', the generic name is 'Paracetamol').
      3.  'classification': The primary pharmacological class. (e.g., for 'Paracetamol', the classification is 'Analgesic & Antipyretic').

      Input medication list:
      ${medicationNames.join(', ')}

      Return ONLY a JSON array of objects with the specified keys. Do not add any markdown, introductory text, or explanations. The array must contain an object for every name in the input list.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    description: "An array of medication classification objects.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            originalName: {
                                type: Type.STRING,
                                description: "The original medication name from the input list.",
                            },
                            genericName: {
                                type: Type.STRING,
                                description: "The generic (chemical) name of the medication.",
                            },
                            classification: {
                                type: Type.STRING,
                                description: "The primary pharmacological classification of the medication.",
                            },
                        },
                        required: ["originalName", "genericName", "classification"],
                    }
                }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error classifying medications:", error);
        return JSON.stringify({ error: "Failed to classify medications with AI." });
    }
};

export const getMedicationComparisonSuggestion = async (medName1: string, medName2: string): Promise<string> => {
    if (!ai) {
        return Promise.resolve("API Key is not configured. Cannot provide AI suggestion.");
    }

    const prompt = `
      You are a helpful medical AI assistant. For educational purposes, briefly compare ${medName1} and ${medName2}, which are both in the same drug class. 
      Explain which might be preferred for common conditions and why. Keep the explanation concise, easy to understand, and under 50 words. 
      Do not give direct medical advice. 
      For example: '[Drug A] is generally preferred for condition X due to faster onset, while [Drug B] is preferred for long-term control.' 
      Return only the suggestion text, without any introductory phrases like 'Certainly, here is...'
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting medication comparison:", error);
        return "Could not retrieve an AI suggestion at this time.";
    }
};