
# 🚀 Team Nexus – EV17  
## AI-Powered Adaptive Learning System – Solution Plan


## 🧩 Phase 1: Data Collection & Acquisition (The Foundation)

### 📚 Dataset Source
- **OULAD — Open University Learning Analytics Dataset**

### 🔍 Scraping Strategy
- **Selenium** → Automate navigation of the OULAD repository  
- **BeautifulSoup** → Parse HTML & extract relevant fields

### 🎯 Output (Round 1 Deliverable)
A master CSV containing:

- `id_student`
- `code_module`
- `total_clicks`
- `mean_score`
- `date_registration`

> This CSV becomes the backbone for all downstream analytics & ML.

---

## 📊 Phase 2: Data Preprocessing & Visualization (The Logic)

### 🎯 EDA Goals
- Detect student **"Dropout Points"**
- Use Pandas to analyze week-wise **total_clicks**
- Compare failing vs. passing student activity

### 📈 Dashboard Visualizations (Power BI / Tableau)

- 📌 **Engagement Heatmap**  
  `Clicks per day vs Score`

- 📌 **Risk Distribution Chart**  
  Percentage of students flagged as **High-Risk** based on:
  - Late submissions
  - Low VLE interactions

### 🧠 Feature Engineering
Create a custom **Struggle Index**:

```

Struggle Index = (100 - Assessment Score) + Late Submission Days

```

> This helps quantify student difficulty levels for prediction & personalization.

---

## 🤖 Phase 3: ML Model Building & Implementation (The Brain)

### 🧠 Model Choices
- **XGBoost**
- **Random Forest**

Why?
- Fast training
- Supports feature importance (excellent for judges)
- Handles tabular data well

### 🎯 Target Variable
`Final_Result` → {Pass, Fail, Withdrawn}

### 🧬 Adaptive Learning Logic
- If prediction = **Fail** → Trigger GenAI-driven **Foundation Module**
- If prediction = **Distinction** → Unlock **Advanced Challenges**

> The ML model becomes the decision system for personalized paths.

---

## 🎭 Phase 4: Real-Time GenAI & 3D Agent Integration (The Wow Factor)

### 🧱 3D Voice Agent Stack
- **Avatar** → Ready Player Me  
- **Rendering** → Three.js  
- **Speech** → ElevenLabs API  
- **AI Tutor Brain** → Gemini API



