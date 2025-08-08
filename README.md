# 🛡️ PreBreach Shield – Cyber Threat Monitoring Dashboard (Frontend + Basic ML Integration)

## 📌 About the Project
**PreBreach Shield** is an AI-powered intrusion detection system designed to detect and prevent both known and zero-day cyber threats before they cause damage.  
This repository contains:
- The **frontend interface** for real-time monitoring, visualization, and user control.
- **Basic machine learning scripts** for data preprocessing and a demo prediction model used to test the UI during development.

The project is part of a larger group effort where:
- **I focused on** building the **dashboard UI** and implementing **basic ML integration** to bridge the frontend with the backend AI system.

---

## 🎯 My Contributions
### 🖥️ Frontend Development
- Designed and developed a **responsive Tailwind CSS + JavaScript dashboard** for real-time cyber threat monitoring.
- Integrated **Chart.js** to visualize:
  - Attack trends over time
  - Severity breakdown of threats
  - Geographic mapping of suspicious IP addresses
- Built **authentication pages** (Login, Signup, Forgot Password) integrated with backend JWT APIs.

### 🤖 Basic Machine Learning
- Developed **Python scripts** for:
  - Cleaning and encoding network log datasets (sample from CIC-IDS2017)
  - Scaling numerical features for model training
- Built a **Random Forest demo model** to classify network traffic as benign or attack for UI testing.
- Created **mock API responses** to simulate backend outputs when the main AI system was not yet ready.

---

## 🧠 Tech Stack
**Frontend:**
- HTML, Tailwind CSS, JavaScript
- Chart.js for data visualization

**Basic ML:**
- Python
- Pandas, scikit-learn, joblib

---

## 📦 Folder Structure

prebreach-shield-frontend-ml/
│
├── frontend/
│ ├── index.html
│ ├── styles.css
│ ├── app.js
│
├── ml_scripts/
│ ├── preprocess.py
│ ├── rf_demo_model.py
│ ├── sample_predictions.json
│
├── README.md
└── requirements.txt

yaml
Copy
Edit




---

## 🚀 How to Run

### 1️⃣ Run Basic ML Demo
```bash
cd ml_scripts
python preprocess.py
python rf_demo_model.py

cd frontend
# Open index.html in your browser


🤝 Acknowledgements
CIC-IDS2017 Dataset – Canadian Institute for Cybersecurity

Chart.js for visualizations

Tailwind CSS for responsive design

scikit-learn for ML model development

yaml
Copy
Edit

---

If you upload **this README** along with:
- **Screenshots of your dashboard**
- **Screenshot of the Random Forest demo output**
- **A simple architecture diagram (Frontend ↔ Backend ↔ ML)**  

…your GitHub will look polished and professional.  

---

I can now make you **`preprocess.py`** and **`rf_demo_model.py`** so the ML demo works instantly when someone clones your repo.  
Do you want me to prepare those?
