# AntiGravity HR Cost Intelligence Engine

An AI-powered analytics platform designed to bridge the gap between corporate calendars and payroll, translating abstract employee time into real-time, actionable financial metrics.

---

## Attendee Details

* **Name:** Syed Mahmood Burhan Mehdi
* **GitHub Username:** burhanmehdi or https://github.com/burhanmehdi
* **LinkedIn Profile:** https://www.linkedin.com/in/syedburhan05/
* **GitHub Project Repository:** https://github.com/burhanmehdi/AntiGravity-HR-Cost-Intelligence-Engine-Project--Hackathon

---

## Problem Statement Selected

```txt
HR Cost Intelligence Engine

```

---

## Project Description

### What is the project about?

The **HR Cost Intelligence Engine** is a real-time analytics dashboard that transforms calendar data into precise financial metrics. It ingests company meeting schedules, automatically calculates the exact dollar cost of each meeting based on the hourly payroll rates of the attendees, and leverages AI to map those expenses to specific internal corporate projects. It also features a statistical anomaly detector to instantly flag unusually expensive time sinks.

### Who is it for?

This tool is built for **HR Managers, Operations Directors, Finance Teams, and Project Managers** who need to monitor workforce efficiency, control operational budgets, and track exactly how much administrative time is being billed against corporate initiatives.

### What problem does it solve?

It solves the massive corporate problem of **"hidden meeting costs."** Companies routinely bleed thousands of dollars on over-attended, recurring, or unnecessary meetings. Because these costs are buried silently in salaried payroll, organizations have historically lacked an automated way to visualize this financial drain or attribute it directly to specific project budgets.

### How does it help the user?

It provides leadership with **instant, actionable financial visibility.** Instead of guessing where engineering or administrative time is being lost, a manager can look at the dashboard and immediately identify:

* Which specific projects are consuming the most meeting budget.
* A **"Heavy Hitters"** leaderboard tracking the single most expensive events.
* Red-flagged **"Spike"** meetings that mathematically deviate from the norm and require structural auditing.

---

## Approach

* **Understanding the Problem:** While companies track software, hardware, and physical expenses down to the penny, employee time—the most expensive resource—is rarely quantified. The core objective was to turn abstract calendar time into clear, inescapable dollar values.
* **User Flow Design:** The user syncs calendar data via the interface. The backend processes the events, runs them through the cost calculation engine, routes them through the AI classification pipeline, and updates the dynamic charts, data tables, and review queues instantaneously without requiring a page refresh.
* **AI Architecture:** Instead of forcing users to manually tag every meeting with an internal billing code, the application utilizes **OpenAI's structured outputs**. The AI securely parses the meeting title and description context, routing the financial cost to the appropriate internal project identifier with high accuracy.
* **Defensive Design (Human-in-the-Loop):** Acknowledging that AI can misclassify edge cases, I engineered a **Human-in-the-Loop Override** system. Unconfident classifications enter a review queue, and HR managers maintain full manual re-allotment controls to reassign costs at any time.
* **Mathematical Guardrails:** To eliminate arbitrary thresholding (e.g., flagging meetings over $500), the engine utilizes a **statistical Z-score anomaly model**. It establishes a baseline from rolling historical data and exclusively flags meetings that represent a statistically significant deviation from normal company operations.

---

## Tech Stack and Tools Used

* **Frontend:** React, Vite, Tailwind CSS, Recharts (Dynamic Visualizations)
* **Backend:** Node.js, Express
* **Database / State:** Firebase / Local Storage Mock State Architecture
* **AI Tools & APIs:** OpenAI API (Structured JSON Outputs)
* **Cloud & Deployment:** Vercel
* **Development Tools:** Git, GitHub, Postman

---

## Key Features

1. **Dynamic Cost Engine:** Automatically computes the real-time monetary cost of any calendar event by multiplying its duration against the combined, granular hourly rates of all participating attendees.
2. **AI Project Mapping:** Uses Large Language Models with forced JSON schemas to automatically categorize meeting metadata and attribute the calculated costs to the correct corporate epic or project tracking code.
3. **Z-Score Anomaly Detection:** Applies real-time statistical outlier modeling to catch sudden payroll spikes and alert administrative teams to extreme budgeting anomalies.
4. **Operational Overrides & Review Queue:** Provides interactive manual controls, ensuring enterprise users maintain complete governance over the data and can easily correct any automated AI assignments.

---

## What is Working?

* The core cost-calculation engine functions flawlessly.
* Dynamic data visualization rendering via Recharts updates fluidly upon simulated calendar sync triggers.
* OpenAI structured output integration maps test data to projects with high precision.
* The statistical Z-score algorithm successfully isolates and flags cost spikes dynamically on the frontend.

---

## What is Still in Progress?

* Production-grade, secure OAuth 2.0 integrations for native Google Workspace and Microsoft Outlook calendar environments are currently simulated/mocked for the scope of the hackathon sandbox.
* Optimizing the database structure to scale fluidly for enterprise-level datasets containing hundreds of thousands of concurrent historical events.

---

## Screenshots or Demo

* **Screenshots:** 
<img width="1913" height="1078" alt="Screenshot 2026-06-13 144945" src="https://github.com/user-attachments/assets/7d889b23-43f8-46cd-aa8c-3394de39f74b" />
<img width="1918" height="1062" alt="Screenshot 2026-06-13 143810" src="https://github.com/user-attachments/assets/21dc5b54-a04d-472d-b00e-82f1a7898f8f" />
<img width="1917" height="1078" alt="Screenshot 2026-06-13 145120" src="https://github.com/user-attachments/assets/f3c8571e-1a96-4065-adc4-3d8e1f3529c5" />


---

## Challenges Faced

Determining an objective definition for a "wasteful" or "expensive" meeting was difficult because a $500 meeting might be standard for an executive steering committee but an absurd spike for a routine dev standup. Moving away from static hardcoded values and pivoting to a dynamic **Z-score mathematical threshold** completely solved this issue, allowing the software to adapt cleanly to various team hierarchies and sizes.

---

## Learnings

Building this system significantly deepened my knowledge of implementing **Structured Outputs** from LLMs to keep AI behavior deterministic and reliable within standard application logic. I also sharpened my skills in managing highly reactive local states in React to keep heavy data visualizations smooth and performance-optimized.

---

## Future Improvements

Given more development time, I would build direct **Slack and Microsoft Teams bot integrations**. The moment an organizer schedules a meeting that triggers a statistical cost spike, the bot would immediately prompt them in chat: *"This meeting is projected to cost the company $850. Are all 12 attendees strictly required?"*—preventing financial bleeding *before* the meeting even begins.

---

## Final Note

This project was built on the core principle that transparency drives organizational efficiency. By making the hidden financial weight of calendar blocks visible, the **HR Cost Intelligence Engine** changes corporate behavior organically, helping teams protect their engineering time, minimize meeting fatigue, and cultivate a leaner, high-output workplace culture.
