import React from 'react';

const macroMasterHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MacroMaster – Macro & Calorie Calculator (TDEE, BMR)</title>
  <meta name="description" content="MacroMaster is a free macro calculator and calorie calculator using Mifflin–St Jeor. Get your TDEE, BMR, and daily macros for weight loss, maintenance, or muscle gain." />
  <meta name="keywords" content="macro calculator, calorie calculator, TDEE calculator, BMR, keto macro calculator, macros for weight loss, IIFYM" />
  <link rel="canonical" href="https://macromaster.example/" />
  <meta property="og:title" content="MacroMaster – Macro & Calorie Calculator" />
  <meta property="og:description" content="Calculate your calories (TDEE) and macros with presets like Balanced, Keto, High-Protein, Low-Carb. Share your results instantly." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://macromaster.example/" />
  <meta property="og:image" content="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><rect width='100%' height='100%' fill='%234361ee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='64' fill='white'>MacroMaster</text></svg>" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#4361ee" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%234361ee%22/><text x=%2250%25%22 y=%2258%25%22 font-size=%2254%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22Arial%22>μ</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg:#f0f4f8; --card:#ffffff; --ink:#212529; --muted:#6b7280;
      --primary:#4361ee; --primary-2:#3a0ca3; --accent:#f72585; --good:#22c55e; --warn:#ef4444;
      --ring: hsla(231, 86%, 60%, .45);
      --radius:20px;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{margin:0; font-family:Poppins,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; background:linear-gradient(120deg,#eef2f7,#f7faff 60%,#eef2ff); color:var(--ink);} 
    .wrap{max-width:1100px; margin:auto; padding:24px;}

    header{display:grid; grid-template-columns:1fr auto; gap:16px; align-items:center; margin:10px 0 24px}
    .brand{display:flex; align-items:center; gap:14px}
    .logo{width:52px; height:52px; display:grid; place-items:center; color:#fff; border-radius:16px; background:linear-gradient(150deg,var(--primary),var(--primary-2)); box-shadow:0 10px 25px rgba(58,12,163,.35), inset 0 -6px 12px rgba(255,255,255,.25)}
    .title{line-height:1}
    .title h1{margin:0; font-size:clamp(22px,3vw,32px)}
    .title p{margin:2px 0 0; color:var(--muted); font-size:clamp(12px,2vw,14px)}

    .card{background:var(--card); border-radius:var(--radius); box-shadow:0 15px 40px rgba(67,97,238,.12), 0 3px 8px rgba(17,24,39,.08); padding:18px; backdrop-filter: blur(6px);} 
    .grid{display:grid; gap:18px}
    .grid-2{grid-template-columns:1fr 1fr}
    .grid-3{grid-template-columns:repeat(3,1fr)}
    @media (max-width:900px){.grid-2,.grid-3{grid-template-columns:1fr}}

    .field{display:flex; flex-direction:column; gap:8px}
    label{font-weight:600; font-size:14px}
    .sub{font-size:12px; color:var(--muted)}
    input[type="number"], select{appearance:none; width:100%; padding:14px 16px; border-radius:14px; border:1px solid #e5e7eb; background:#fbfdff; outline:none; transition:.2s ease; font:600 14px Poppins,sans-serif}
    input[type="number"]:focus, select:focus{border-color:var(--primary); box-shadow:0 0 0 6px var(--ring)}

    .seg{display:flex; gap:10px; flex-wrap:wrap}
    .chip{position:relative; padding:12px 14px; border-radius:14px; font-weight:700; font-size:13px; background:linear-gradient(180deg,#fff,#f4f7ff); border:1px solid #e5e7eb; cursor:pointer; transition:transform .12s ease, box-shadow .12s ease}
    .chip[aria-checked="true"]{border-color:var(--primary); box-shadow:0 10px 16px rgba(67,97,238,.15), inset 0 -6px 10px rgba(67,97,238,.06)}
    .chip:hover{transform:translateY(-1px)}

    .btn{--elev:0 15px 30px rgba(67,97,238,.35); --inset: inset 0 -6px 14px rgba(255,255,255,.4);
      display:inline-flex; align-items:center; gap:10px; padding:14px 18px; border-radius:18px; border:none; font-weight:800; text-transform:uppercase; letter-spacing:.6px; cursor:pointer; background:linear-gradient(160deg,var(--primary),var(--primary-2)); color:#fff; box-shadow:var(--elev), var(--inset); transform:translateY(0); transition:transform .12s ease, box-shadow .2s ease}
    .btn:hover{transform:translateY(-2px)}
    .btn:active{transform:translateY(0)}
    .btn.secondary{background:linear-gradient(160deg,#111827,#374151)}
    .btn.ghost{background:#fff;color:var(--primary); border:2px solid var(--primary); box-shadow:0 4px 12px rgba(67,97,238,.15)}

    .actions{display:flex; gap:12px; flex-wrap:wrap}

    .results{display:grid; gap:16px}
    .result-pill{display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; padding:14px 16px; background:linear-gradient(180deg,#ffffff,#f6f8ff); border:1px solid #e5e7eb; border-radius:16px}
    .kpi{display:flex; flex-direction:column; text-align:right}
    .kpi .v{font-weight:800; font-size:20px}
    .kpi .l{font-size:12px; color:var(--muted)}

    details{background:#fff; border:1px dashed #e5e7eb; padding:12px 14px; border-radius:14px}
    details summary{cursor:pointer; font-weight:700}

    footer{margin:28px 0; color:var(--muted); font-size:12px; text-align:center}

    /* tiny toast */
    .toast{position:fixed; right:16px; bottom:16px; background:#111827; color:#fff; padding:10px 12px; border-radius:12px; opacity:0; transform:translateY(6px); transition:.2s ease; pointer-events:none}
    .toast.show{opacity:1; transform:translateY(0)}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <div class="logo" aria-hidden="true">🍽️</div>
        <div class="title">
          <h1>MacroMaster</h1>
          <p>Smart calorie & macro calculator – BMR (Mifflin–St Jeor), TDEE, and presets.</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost" id="shareBtn" aria-label="Share results">Share</button>
        <button class="btn secondary" id="resetBtn" aria-label="Reset all">Reset</button>
      </div>
    </header>

    <section class="grid grid-2">
      <form id="macroForm" class="card grid" autocomplete="on">
        <h2 style="margin:0">Your Details</h2>

        <div class="seg" role="radiogroup" aria-label="Units">
          <button type="button" class="chip" data-units="metric" aria-checked="true" aria-label="Metric (kg, cm)">Metric (kg, cm)</button>
          <button type="button" class="chip" data-units="imperial" aria-checked="false" aria-label="Imperial (lb, ft/in)">Imperial (lb, ft/in)</button>
        </div>

        <div class="grid grid-3" id="metricFields">
          <div class="field">
            <label for="age">Age</label>
            <input id="age" name="age" type="number" inputmode="numeric" min="10" max="100" placeholder="Years" required />
          </div>
          <div class="field">
            <label for="heightCm">Height (cm)</label>
            <input id="heightCm" name="heightCm" type="number" inputmode="decimal" min="100" max="250" step="0.1" placeholder="e.g., 175" required />
          </div>
          <div class="field">
            <label for="weightKg">Weight (kg)</label>
            <input id="weightKg" name="weightKg" type="number" inputmode="decimal" min="30" max="300" step="0.1" placeholder="e.g., 70" required />
          </div>
        </div>

        <div class="grid grid-3" id="imperialFields" style="display:none">
          <div class="field">
            <label for="ageImp">Age</label>
            <input id="ageImp" name="ageImp" type="number" inputmode="numeric" min="10" max="100" placeholder="Years" />
          </div>
          <div class="field">
            <label>Height (ft / in)</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
              <input id="heightFt" type="number" inputmode="numeric" min="3" max="8" placeholder="ft" />
              <input id="heightIn" type="number" inputmode="numeric" min="0" max="11" placeholder="in" />
            </div>
          </div>
          <div class="field">
            <label for="weightLb">Weight (lb)</label>
            <input id="weightLb" type="number" inputmode="decimal" min="66" max="660" step="0.1" placeholder="e.g., 154" />
          </div>
        </div>

        <div class="seg" role="radiogroup" aria-label="Gender">
          <button type="button" class="chip" data-gender="male" aria-checked="true">Male</button>
          <button type="button" class="chip" data-gender="female" aria-checked="false">Female</button>
        </div>

        <div class="field">
          <label for="activity">Activity Level</label>
          <select id="activity" required>
            <option value="1.2">Sedentary (little or no exercise)</option>
            <option value="1.375">Lightly active (1–3 days/week)</option>
            <option value="1.55" selected>Moderately active (3–5 days/week)</option>
            <option value="1.725">Very active (6–7 days/week)</option>
            <option value="1.9">Extra active (physical job or 2x training)</option>
          </select>
          <p class="sub">We multiply your BMR by this factor to calculate TDEE.</p>
        </div>

        <div class="field">
          <label>Goal</label>
          <div class="seg" role="radiogroup">
            <button type="button" class="chip" data-goal="cut" aria-checked="true">Weight Loss (−500 kcal)</button>
            <button type="button" class="chip" data-goal="maintain" aria-checked="false">Maintenance</button>
            <button type="button" class="chip" data-goal="bulk" aria-checked="false">Muscle Gain (+500 kcal)</button>
          </div>
        </div>

        <div class="field">
          <label>Macro Preset</label>
          <div class="seg" role="radiogroup">
            <button type="button" class="chip" data-preset="balanced" aria-checked="true">Balanced</button>
            <button type="button" class="chip" data-preset="keto" aria-checked="false">Ketogenic</button>
            <button type="button" class="chip" data-preset="highp" aria-checked="false">High Protein</button>
            <button type="button" class="chip" data-preset="lowcarb" aria-checked="false">Low Carb</button>
          </div>
        </div>

        <div class="actions">
          <button class="btn" type="submit">Calculate</button>
          <button class="btn ghost" type="button" id="copyLinkBtn">Copy Share Link</button>
        </div>

        <details>
          <summary>How we calculate (BMR, TDEE & macros)</summary>
          <p><strong>Mifflin–St Jeor (BMR)</strong></p>
          <ul>
            <li>Male: BMR = 10×kg + 6.25×cm − 5×age + 5</li>
            <li>Female: BMR = 10×kg + 6.25×cm − 5×age − 161</li>
          </ul>
          <p><strong>TDEE</strong> = BMR × activity factor.</p>
          <p><strong>Goal calories</strong> adjust TDEE by −500 (cut), 0 (maintain), or +500 (bulk).</p>
          <p><strong>Macros</strong> are split by preset, then converted to grams (P=4 kcal/g, C=4 kcal/g, F=9 kcal/g).</p>
        </details>
      </form>

      <aside class="card" id="results">
        <h2 style="margin:0 0 8px">Your Results</h2>
        <div class="results" id="resultsBody">
          <div class="result-pill">
            <div>Basal Metabolic Rate (BMR)</div>
            <div class="kpi"><div class="v" id="bmrKcal">—</div><div class="l">kcal/day</div></div>
          </div>
          <div class="result-pill">
            <div>Total Daily Energy Expenditure (TDEE)</div>
            <div class="kpi"><div class="v" id="tdeeKcal">—</div><div class="l">kcal/day</div></div>
          </div>
          <div class="result-pill">
            <div>Goal Calories</div>
            <div class="kpi"><div class="v" id="goalKcal">—</div><div class="l">kcal/day</div></div>
          </div>
          <div class="result-pill">
            <div>Protein</div>
            <div class="kpi"><div class="v" id="proteinGr">—</div><div class="l">grams/day</div></div>
            <div class="kpi"><div class="v" id="proteinKcal">—</div><div class="l">kcal</div></div>
          </div>
          <div class="result-pill">
            <div>Carbohydrates</div>
            <div class="kpi"><div class="v" id="carbGr">—</div><div class="l">grams/day</div></div>
            <div class="kpi"><div class="v" id="carbKcal">—</div><div class="l">kcal</div></div>
          </div>
          <div class="result-pill">
            <div>Fat</div>
            <div class="kpi"><div class="v" id="fatGr">—</div><div class="l">grams/day</div></div>
            <div class="kpi"><div class="v" id="fatKcal">—</div><div class="l">kcal</div></div>
          </div>
        </div>
        <p class="sub" id="presetNote">Preset: <strong>Balanced</strong> (P 30% / C 40% / F 30%)</p>
      </aside>
    </section>

    <section class="card" style="margin-top:18px">
      <h3 style="margin-top:0">SEO Plan & Content Ideas</h3>
      <div class="grid grid-2">
        <div>
          <ul>
            <li><strong>Main page</strong> targets: “Macro Calculator”, “Calorie Calculator”.</li>
            <li>Create articles for: “Ultimate Keto Macro Calculator Guide”, “How to Calculate Macros for Weight Loss Without Losing Muscle”, “TDEE vs. BMR – What’s the Difference?”.</li>
            <li>On-page: unique title, description, H1–H3 with target keywords.</li>
          </ul>
        </div>
        <div>
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="text-align:left"><th style="padding:8px; border-bottom:1px solid #e5e7eb">Calculator</th><th style="padding:8px; border-bottom:1px solid #e5e7eb">Primary Keyword</th><th style="padding:8px; border-bottom:1px solid #e5e7eb">Long-Tail</th></tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px">Macronutrient</td><td style="padding:8px">macro calculator</td><td style="padding:8px">keto macro calculator; macro calculator for weight loss</td></tr>
              <tr><td style="padding:8px">Calorie</td><td style="padding:8px">calorie calculator</td><td style="padding:8px">TDEE calculator; calorie calculator for muscle gain</td></tr>
              <tr><td style="padding:8px">Protein</td><td style="padding:8px">protein calculator</td><td style="padding:8px">how much protein per day for muscle</td></tr>
              <tr><td style="padding:8px">BMI</td><td style="padding:8px">BMI calculator</td><td style="padding:8px">—</td></tr>
              <tr><td style="padding:8px">General Health</td><td style="padding:8px">—</td><td style="padding:8px">IIFYM calculator; flexible dieting calculator; best macro tracking app</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="sub">Link building tip: share on fitness subreddits and forums; ask bloggers for reviews.</p>
    </section>

    <footer>
      <div>© <span id="yr"></span> MacroMaster. Educational tool – consult a professional for medical advice.</div>
    </footer>
  </div>

  <div class="toast" id="toast">Copied!</div>

  <script>
    // --- Helpers ------------------------------------------------------------
    const $ = sel => document.querySelector(sel);
    const $$ = sel => [...document.querySelectorAll(sel)];
    const round = (n, d=0) => Number.parseFloat(n).toFixed(d);
    const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

    // This function shows a small notification or 'toast' message.
    function toast(msg){
      const t = $('#toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(()=> t.classList.remove('show'), 1600);
    }

    // --- State --------------------------------------------------------------
    const state = {
      units: 'metric', gender: 'male', goal:'cut', preset:'balanced'
    };

    const PRESETS = {
      balanced:{ p:0.30, c:0.40, f:0.30, note:'P 30% / C 40% / F 30%' },
      keto:{ p:0.20, c:0.05, f:0.75, note:'P 20% / C 5% / F 75%' },
      highp:{ p:0.35, c:0.35, f:0.30, note:'P 35% / C 35% / F 30%' },
      lowcarb:{ p:0.30, c:0.25, f:0.45, note:'P 30% / C 25% / F 45%' },
    };

    // --- ENVIRONMENT CHECK for history.replaceState & share links ----------
    // Some embed environments (about:srcdoc / sandboxed iframes) disallow creating
    // history entries or changing the URL. The original error came from trying to
    // call history.replaceState() inside such an environment. We'll detect and
    // gracefully fall back.
    const ENV = {
      canReplaceState: (function(){
        try{
          // If document URL starts with about:srcdoc or protocol is 'about:', avoid replace.
          if(location && typeof location.href === 'string' && location.href.startsWith('about:')) return false;
          // If running in a very restricted sandboxed iframe, this may still fail — we'll still try in try/catch later.
          return true;
        }catch(e){ return false; }
      })()
    };

    function safeReplaceState(qs){
      try{
        if(!ENV.canReplaceState) return false;
        const newUrl = qs ? \`\${location.pathname}?\${qs}\` : location.pathname;
        history.replaceState(null, '', newUrl);
        return true;
      }catch(err){
        // Silently fail and log for debugging — UI will still work.
        console.warn('safeReplaceState failed:', err);
        return false;
      }
    }

    function getShareableLink(){
      try{
        const qs = paramsFromState();
        // If we cannot safely construct a full origin+path link (sandboxed), return just the query string.
        if(!ENV.canReplaceState) return \`?\${qs}\`;
        return \`\${location.origin}\${location.pathname}?\${qs}\`;
      }catch(e){
        return \`?\${paramsFromState()}\`;
      }
    }

    // --- UI wiring for segmented chips -------------------------------------
    function bindChips(attr, onChange){
      $$(\`.chip[data-\${attr}]\`).forEach(ch => {
        ch.addEventListener('click', () => {
          $$(\`.chip[data-\${attr}]\`).forEach(c => c.setAttribute('aria-checked','false'));
          ch.setAttribute('aria-checked','true');
          const val = ch.dataset[attr];
          if(onChange) onChange(val);
        });
      });
    }

    bindChips('units', (v)=>{
      state.units = v;
      $('#metricFields').style.display = v==='metric' ? 'grid':'none';
      $('#imperialFields').style.display = v==='imperial' ? 'grid':'none';
    });
    bindChips('gender', (v)=> state.gender = v);
    bindChips('goal', (v)=> state.goal = v);
    bindChips('preset', (v)=>{ state.preset = v; updatePresetNote(); });

    function updatePresetNote(){
      const p = PRESETS[state.preset];
      $('#presetNote').innerHTML = \`Preset: <strong>\${labelForPreset(state.preset)}</strong> (\${p.note})\`;
    }

    function labelForPreset(k){
      return {balanced:'Balanced',keto:'Ketogenic',highp:'High Protein',lowcarb:'Low Carb'}[k] || k;
    }

    // --- Calculations -------------------------------------------------------
    function toMetric(){
      if(state.units==='metric'){
        const age = Number($('#age').value);
        const cm = Number($('#heightCm').value);
        const kg = Number($('#weightKg').value);
        return {age, cm, kg};
      } else {
        const age = Number($('#ageImp').value);
        const ft = Number($('#heightFt').value); const inch = Number($('#heightIn').value);
        const cm = ( (ft||0)*12 + (inch||0) ) * 2.54;
        const lb = Number($('#weightLb').value);
        const kg = lb * 0.45359237;
        return {age, cm, kg};
      }
    }

    function bmrMifflin({gender, age, cm, kg}){
      if(!age || !cm || !kg) return 0;
      const base = 10*kg + 6.25*cm - 5*age + (gender==='male' ? 5 : -161);
      return base;
    }

    function tdeeFrom(bmr, activity){
      return bmr * Number(activity || 1.2);
    }

    function adjustForGoal(tdee, goal){
      if(goal==='cut') return Math.max(1200, tdee - 500); // safety floor
      if(goal==='bulk') return tdee + 500;
      return tdee;
    }

    function macrosFromCalories(kcal, preset){
      const p = PRESETS[preset];
      const pK = kcal * p.p, cK = kcal * p.c, fK = kcal * p.f;
      return {
        pK, cK, fK,
        pG: pK/4, cG: cK/4, fG: fK/9
      };
    }

    // --- Rendering ----------------------------------------------------------
    function renderNumbers({bmr, tdee, goal, macros}){
      $('#bmrKcal').textContent   = round(bmr,0);
      $('#tdeeKcal').textContent  = round(tdee,0);
      $('#goalKcal').textContent  = round(goal,0);
      $('#proteinGr').textContent = round(macros.pG,0);
      $('#proteinKcal').textContent = round(macros.pK,0);
      $('#carbGr').textContent    = round(macros.cG,0);
      $('#carbKcal').textContent  = round(macros.cK,0);
      $('#fatGr').textContent     = round(macros.fG,0);
      $('#fatKcal').textContent   = round(macros.fK,0);
    }

    // --- Share --------------------------------------------------------------
    async function shareResults(){
      const {age, cm, kg} = toMetric();
      const activity = $('#activity').value;
      const bmr = bmrMifflin({gender:state.gender, age, cm, kg});
      const tdee = tdeeFrom(bmr, activity);
      const goal = adjustForGoal(tdee, state.goal);
      const m = macrosFromCalories(goal, state.preset);
      const text = \`MacroMaster Results\\n\\nBMR: \${round(bmr)} kcal\\nTDEE: \${round(tdee)} kcal\\nGoal: \${round(goal)} kcal (\${labelForPreset(state.preset)})\\nProtein: \${round(m.pG)} g (\${round(m.pK)} kcal)\\nCarbs: \${round(m.cG)} g (\${round(m.cK)} kcal)\\nFat: \${round(m.fG)} g (\${round(m.fK)} kcal)\`;
      
      // We will first try to use the navigator.share API.
      if(navigator.share){
        try{ 
          await navigator.share({title:'MacroMaster Results', text});
        } catch(e){ 
          console.warn(e); 
        }
      } else {
        // As a fallback, try to copy to clipboard.
        try{
          // We use document.execCommand('copy') as it has broader support
          // in sandboxed iframes than navigator.clipboard.
          const tempTextarea = document.createElement('textarea');
          tempTextarea.value = text;
          document.body.appendChild(tempTextarea);
          tempTextarea.select();
          document.execCommand('copy');
          document.body.removeChild(tempTextarea);
          toast('Results copied to clipboard');
        } catch(e){
          // If all else fails, show a toast message.
          console.error('Could not copy results to clipboard.', e);
          toast('Could not share results.');
        }
      }
    }

    function paramsFromState(){
      const {age, cm, kg} = toMetric();
      const obj = {
        u: state.units[0], g: state.gender[0], goal: state.goal, pre: state.preset,
        a: $('#activity').value, age, cm: round(cm,1), kg: round(kg,1)
      };
      return new URLSearchParams(obj).toString();
    }

    function applyParams(ps){
      // Units
      const units = ps.get('u')==='i'?'imperial':'metric';
      $$(".chip[data-units]").forEach(c=>c.setAttribute('aria-checked', c.dataset.units===units?'true':'false'));
      state.units = units; $('#metricFields').style.display = units==='metric'?'grid':'none'; $('#imperialFields').style.display = units==='imperial'?'grid':'none';

      // Gender
      const gender = ps.get('g')==='f'?'female':'male';
      $$(".chip[data-gender]").forEach(c=>c.setAttribute('aria-checked', c.dataset.gender===gender?'true':'false'));
      state.gender = gender;

      // Goal & Preset
      const goal = ps.get('goal')||'cut';
      $$(".chip[data-goal]").forEach(c=>c.setAttribute('aria-checked', c.dataset.goal===goal?'true':'false'));
      state.goal = goal;
      const pre = ps.get('pre')||'balanced';
      $$(".chip[data-preset]").forEach(c=>c.setAttribute('aria-checked', c.dataset.preset===pre?'true':'false'));
      state.preset = pre; updatePresetNote();

      // Activity
      if(ps.get('a')) $('#activity').value = ps.get('a');

      // Numbers
      const age = Number(ps.get('age')||'');
      const cm  = Number(ps.get('cm')||'');
      const kg  = Number(ps.get('kg')||'');

      if(units==='metric'){
        if(age) $('#age').value = age;
        if(cm)  $('#heightCm').value = cm;
        if(kg)  $('#weightKg').value = kg;
      } else {
        if(age) $('#ageImp').value = age;
        if(cm){ const totalIn = cm/2.54; const ft = Math.floor(totalIn/12); const inch = Math.round(totalIn - ft*12); $('#heightFt').value=ft; $('#heightIn').value=inch; }
        if(kg) $('#weightLb').value = Math.round(kg/0.45359237);
      }
    }

    // --- Events -------------------------------------------------------------
    $('#macroForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const {age, cm, kg} = toMetric();
      if(!age || !cm || !kg){ toast('Please complete your details'); return; }
      const bmr = bmrMifflin({gender:state.gender, age, cm, kg});
      const tdee = tdeeFrom(bmr, $('#activity').value);
      const goal = adjustForGoal(tdee, state.goal);
      const macros = macrosFromCalories(goal, state.preset);
      renderNumbers({bmr,tdee,goal,macros});
      const qs = paramsFromState();
      // Use safeReplaceState: this will skip URL updates in sandboxed "about:srcdoc" environments
      const ok = safeReplaceState(qs);
      if(!ok){
        // In restricted embed environments we can't modify the browser URL — offer the query string in a toast
        toast('Running in sandbox: URL not updated. Use Copy Share Link to share.');
      }
    });

    $('#shareBtn').addEventListener('click', shareResults);
    
    $('#copyLinkBtn').addEventListener('click', async ()=>{
      const link = getShareableLink();
      try{ 
        // We use document.execCommand('copy') as it has broader support
        // in sandboxed iframes than navigator.clipboard.
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = link;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        toast('Shareable link copied'); 
      } catch(e){
        // In the rare case both execCommand and clipboard API fail, inform the user.
        console.error('Could not copy link.', e);
        toast('Could not copy link. Check the console for the link.');
        console.log('Shareable link: ', link);
      }
    });

    $('#resetBtn').addEventListener('click', ()=>{
      document.getElementById('macroForm').reset();
      // reset toggles
      $$(".chip[data-units]").forEach((c,i)=>c.setAttribute('aria-checked', i===0?'true':'false'));
      $$(".chip[data-gender]").forEach((c,i)=>c.setAttribute('aria-checked', i===0?'true':'false'));
      $$(".chip[data-goal]").forEach((c,i)=>c.setAttribute('aria-checked', i===0?'true':'false'));
      $$(".chip[data-preset]").forEach((c,i)=>c.setAttribute('aria-checked', i===0?'true':'false'));
      state.units='metric'; state.gender='male'; state.goal='cut'; state.preset='balanced';
      $('#metricFields').style.display='grid'; $('#imperialFields').style.display='none';
      updatePresetNote();
      renderNumbers({bmr:0,tdee:0,goal:0,macros:{pG:0,pK:0,cG:0,cK:0,fG:0,fK:0}});
      // Try to clear URL query safely
      safeReplaceState('');
    });

    // --- Init ---------------------------------------------------------------
    updatePresetNote();
    $('#yr').textContent = new Date().getFullYear();
    const ps = new URLSearchParams(location.search);
    if([...ps.keys()].length){ applyParams(ps); }
  </script>
</body>
</html>
`;

const MacroMaster: React.FC = () => {
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none' }}>
            <iframe
                srcDoc={macroMasterHtml}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '16px' }}
                title="MacroMaster Calculator"
                sandbox="allow-scripts allow-forms allow-same-origin"
            />
        </div>
    );
};

export default MacroMaster;
