# 📊 HR Cost Intelligence Engine
### AI-Powered Calendar Resource & Meeting Cost Analytics (Hackathon Submission)

> [!IMPORTANT]
> **Dear Hackathon Judges:**
> We have prepared a dedicated, high-fidelity **[Judges' Guide (JUDGES_GUIDE.md)](file:///c:/Users/Burhan%20Mehdi/OneDrive/Desktop/HR%20Cost%2520Intelligence%2520Project/JUDGES_GUIDE.md)** which explains the core calculations, Z-Score math, and system flows in simple terms, alongside a step-by-step demonstration walkthrough. Please refer to it for the best evaluation experience!

Meetings are one of the largest hidden expenditures in modern organizations. The **HR Cost Intelligence Engine** is a full-stack dashboard designed to solve this by ingesting calendar events, dynamically calculating meeting financial costs, mapping them to project codes using AI, flagging statistical cost anomalies, and providing manager review controls.

---

## 🚀 Key Features for Judges

1. **AI-Powered Project Mapping**: Automatically parses meeting titles and descriptions to attribute them to projects (e.g., *Project Apollo*, *Project Zeus*). Uses **OpenAI Structured Outputs** with a robust, zero-configuration local keyword heuristic fallback if no API key is provided.
2. **Cost Estimation Engine**: Dynamically calculates meeting costs based on duration and employee payroll hourly rates:
   $$\text{Meeting Cost} = \text{Duration (hours)} \times \sum (\text{Attendee Hourly Rates})$$
3. **Z-Score Anomaly Detector**: Employs historical standard deviation to flag meeting cost outliers ($|Z| > 2.0$) in real-time.
4. **Calendar Audit Schedule Grid**: A visual, daily calendar timeline categorizing all meetings by their current verification state:
   - 🟢 **`OK`**: Audited and confirmed by HR.
   - 🔘 **`AI`**: Auto-assigned by AI with high confidence.
   - 🟡 **`AUDIT`**: Flagged for HR manager review (confidence $< 75\%$).
   - 🔴 **`SPIKE`**: Flagged as a statistical cost outlier.
5. **HR Re-allotment Controls**: HR managers can reassign/re-allot project mappings directly from the audit log or send meetings back to the review queue if they are unsure.
6. **Google Calendar Sync Simulator**: An interactive simulator that pushes new calendar events to the engine in real-time, demonstrating live data ingestion, Z-score alerts, and queue routing.

---

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI, SQLite (database), SQLAlchemy (ORM).
*   **Frontend**: React (Vite), Vanilla CSS (for sleek design control), Recharts (data visualization), Lucide React (icons).

---

## ⚡ Quick Start Guide (Get Running in 3 Minutes)

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### 1. Clone & Set Up Backend
Open a terminal in the root directory:
```bash
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### *(Optional)* Add OpenAI Key
Create a `.env` file inside the `backend/` folder:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
*If left blank, the system automatically runs in **Mock AI Mode** using local keyword matching, so you can test it immediately without an API key.*

#### Seed the Database
Initialize the SQLite database with rich mock data:
```bash
python -m app.seed
```

#### Start FastAPI Server
```bash
python -m uvicorn app.main:app --port 8000
```
*The backend API will run at [http://localhost:8000](http://localhost:8000)*.

---

### 2. Set Up Frontend
Open a **new** terminal in the root directory:
```bash
# Navigate to frontend
cd frontend

# Install package dependencies
npm install

# Start Vite development server
npm run dev
```
*Open [http://localhost:5173](http://localhost:5173) in your browser to view the dashboard!*

---

## 📂 Project Architecture

```
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI routes and dashboard API endpoints
│   │   ├── models.py      # SQLAlchemy ORM models (Project, Employee, Meeting, Attribution)
│   │   ├── schemas.py     # Pydantic request/response models
│   │   ├── ai_service.py  # OpenAI structured output + Local mock keyword fallback
│   │   ├── anomaly.py     # Cost calculations and Z-score anomaly math
│   │   └── seed.py        # Demo database seed generator script
│   └── requirements.txt   # Backend requirements
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React dashboard, chart, and calendar component
│   │   ├── index.css      # Custom styles and high-tech grid background
│   │   └── main.jsx       # React entry point
│   ├── package.json       # Frontend package configuration
│   └── vite.config.js     # Vite compilation settings
├── README.md              # Main project guide
└── JUDGES_GUIDE.md        # Dedicated Hackathon Evaluation & Interactive Guide
```

---

## 💡 How to Demo the Project for Judges (Quick Walkthrough)

*For a detailed walkthrough, please see the **[Judges' Guide](file:///c:/Users/Burhan%20Mehdi/OneDrive/Desktop/HR%20Cost%2520Intelligence%2520Project/JUDGES_GUIDE.md)**.*

1. **Check the Dashboard**: Notice the flat monochrome side-by-side bar chart showing **Allocated Budget** vs **Actual Spent** across 5 projects, including the newly added *Project Athena (AI Platform)*.
2. **Review the Calendar Schedule**: At the center, look at the **Calendar Audit Schedule** showing all meetings color-coded by their state.
3. **Simulate Calendar Sync**: Click the **"Simulate Calendar Sync"** button in the header:
    - **Click 1**: Syncs standard meetings; they are automatically attributed by AI.
    - **Click 2**: Syncs a critical database breach audit. Because of its high cost ($4,275), the Z-score engine immediately flags it as a red **`SPIKE`** on the calendar and pushes it to the **Cost Anomalies** feed on the right.
    - **Click 3**: Syncs an ambiguous meeting (*"Touch base about resources"*). Since AI confidence is low, it is flagged as a yellow **`AUDIT`** and routed into the **Human-in-the-Loop Review Queue**.
4. **Confirm / Reassign**: Go to the **Review Queue**, select a project from the dropdown, and click **"Reassign"**. The meeting immediately moves to the **Resolution History** log, turns green (**`OK`**) on the calendar, and the project charts update dynamically.
5. **Re-allot / Return**: In the **Resolution History** log at the bottom, select a card, click **"Re-allot Project"**, and click **"Unsure? Send to Review Queue"**. The meeting moves back to the pending queue and the calendar updates instantly.
6. **Payroll Configuration**: Click the **"Payroll Config"** button in the top right to open the drawer. Change employee hourly rates and witness the entire database's unreviewed meeting costs and anomaly Z-scores recalculate dynamically.
