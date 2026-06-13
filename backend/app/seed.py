import datetime
import random
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import Project, Employee, Meeting, MeetingAttribution
from .anomaly import calculate_meeting_cost, detect_anomaly
from .ai_service import attribute_meeting

def seed_db():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 1. Seed Projects
        print("Seeding Projects...")
        projects = [
            Project(id="proj_apollo", name="Project Apollo (Space Launch)", description="Engineering and telemetry for the next lunar satellite launch.", budget=12000.0),
            Project(id="proj_zeus", name="Project Zeus (Cybersecurity)", description="Securing internal infrastructure, data encryption, and zero-trust firewall.", budget=15000.0),
            Project(id="proj_marketing", name="Q3 Global Ad Campaign", description="Rebranding design and programmatic marketing campaigns across social media.", budget=4000.0),
            Project(id="proj_operations", name="Internal Operations & HR", description="Day-to-day administrative tasks, payroll, recruiting, and office management.", budget=5000.0),
            Project(id="proj_athena", name="Project Athena (AI Platform)", description="Developing the core machine learning models and LLM agent integrations for automated HR tasks.", budget=10000.0),
        ]
        db.add_all(projects)
        db.commit()
        
        # 2. Seed Employees
        print("Seeding Employees...")
        employees = [
            Employee(id="emp_sarah", name="Aarav Sharma", email="aarav.sharma@company.com", hourly_rate=250.0),
            Employee(id="emp_john", name="Zeeshan Khan", email="zeeshan.khan@company.com", hourly_rate=180.0),
            Employee(id="emp_alice", name="Priya Patel", email="priya.patel@company.com", hourly_rate=120.0),
            Employee(id="emp_bob", name="Sana Ahmed", email="sana.ahmed@company.com", hourly_rate=95.0),
            Employee(id="emp_bruce", name="Aditya Verma", email="aditya.verma@company.com", hourly_rate=150.0),
            Employee(id="emp_clark", name="Farhan Qureshi", email="farhan.qureshi@company.com", hourly_rate=85.0),
            Employee(id="emp_tim", name="Deepak Gupta", email="deepak.gupta@company.com", hourly_rate=70.0),
        ]
        db.add_all(employees)
        db.commit()
        
        # Helper to fetch active projects/employees context
        projects_dict = [{"id": p.id, "name": p.name, "description": p.description} for p in projects]
        emp_map = {e.id: e for e in employees}
        
        # 3. Define standard and anomaly meeting data
        print("Generating mock meetings...")
        now = datetime.datetime.utcnow()
        
        # List of historical standard meetings (chronological order)
        mock_meetings = [
            # Apollo Meetings
            {"id": "m1", "title": "Apollo Mission Launch Telemetry", "description": "Review rocket trajectory calculations and sensor systems.", "attendees": ["emp_john", "emp_alice", "emp_tim"], "duration": 1.5, "days_ago": 12},
            {"id": "m2", "title": "Apollo Propulsion Sprint Planning", "description": "Weekly task delegation for the rocket design team.", "attendees": ["emp_john", "emp_tim"], "duration": 1.0, "days_ago": 11},
            {"id": "m3", "title": "Moon Orbit Calculations Sync", "description": "Evaluating mathematical models for stable lunar orbit injection.", "attendees": ["emp_john", "emp_alice"], "duration": 2.0, "days_ago": 10},
            
            # Zeus Meetings
            {"id": "m4", "title": "Zeus Firewall Implementation Plan", "description": "Reviewing security logs and installing the new network gateway.", "attendees": ["emp_john", "emp_bruce", "emp_tim"], "duration": 1.0, "days_ago": 9},
            {"id": "m5", "title": "Penetration Testing Review", "description": "Cybersecurity audit results on internal payroll database.", "attendees": ["emp_bruce", "emp_john"], "duration": 1.5, "days_ago": 8},
            {"id": "m6", "title": "OAuth 2.0 Identity Server", "description": "Integrating authentication middleware for developers.", "attendees": ["emp_bruce", "emp_tim"], "duration": 1.0, "days_ago": 8},
            
            # Marketing Meetings
            {"id": "m7", "title": "Q3 Ad Strategy Brainstorm", "description": "Creative workshop for social media slogans and banner ad assets.", "attendees": ["emp_bob", "emp_alice"], "duration": 2.0, "days_ago": 7},
            {"id": "m8", "title": "SEO Campaign Keyword Setup", "description": "Marketing audit to boost search engine indexing rankings.", "attendees": ["emp_bob", "emp_clark"], "duration": 1.0, "days_ago": 6},
            {"id": "m16", "title": "Q3 Video Campaign Video Shoot Planning", "description": "Scheduling videographers, scripting, and talent coordination.", "attendees": ["emp_alice", "emp_bob", "emp_tim", "emp_clark"], "duration": 3.0, "days_ago": 3},
            
            # Operations/HR Meetings
            {"id": "m9", "title": "Weekly Recruiting Pipeline Sync", "description": "Status updates on hiring candidates for developer roles.", "attendees": ["emp_clark", "emp_john"], "duration": 1.0, "days_ago": 5},
            {"id": "m10", "title": "Payroll Administration Review", "description": "Auditing monthly payouts and contractor timesheets.", "attendees": ["emp_clark", "emp_sarah"], "duration": 0.5, "days_ago": 4},
            {"id": "m17", "title": "Quarterly Performance Review Process", "description": "Reviewing self-evaluation rubrics and scheduling manager alignment syncs.", "attendees": ["emp_sarah", "emp_clark", "emp_tim"], "duration": 2.0, "days_ago": 5},
            
            # Athena Meetings (AI Platform)
            {"id": "m13", "title": "Athena RAG Pipeline Design Sync", "description": "Discuss vector database selection and semantic chunking strategies.", "attendees": ["emp_sarah", "emp_john", "emp_alice"], "duration": 2.5, "days_ago": 6},
            {"id": "m14", "title": "LLM Fine-tuning Hyperparameters", "description": "Evaluating training loss and weights for custom domain models.", "attendees": ["emp_sarah", "emp_bruce"], "duration": 2.0, "days_ago": 4},
            {"id": "m15", "title": "AI Agent Security Boundaries Review", "description": "Defining system prompt guardrails and API access limits.", "attendees": ["emp_bruce", "emp_sarah", "emp_tim"], "duration": 1.5, "days_ago": 2},
            
            # General low cost meetings
            {"id": "m11", "title": "Daily Developer Standup", "description": "Quick check-in on sprint tasks.", "attendees": ["emp_john", "emp_alice", "emp_tim"], "duration": 0.25, "days_ago": 3},
            {"id": "m12", "title": "General Office Sync", "description": "Aligning on workspace logistics and snack replenishments.", "attendees": ["emp_clark", "emp_bob"], "duration": 1.0, "days_ago": 3},
            
            # -- ANOMALIES (High cost due to excessive attendees and duration) --
            {"id": "m_anomaly1", "title": "EMERGENCY: Infrastructure Security Breach Audit", "description": "Immediate meeting of all leads to investigate a critical cybersecurity leak in the production database.", "attendees": ["emp_sarah", "emp_john", "emp_bruce", "emp_alice", "emp_bob", "emp_clark", "emp_tim"], "duration": 4.5, "days_ago": 2},
            {"id": "m_anomaly2", "title": "Executive Board Apollo Project Review", "description": "Deep budget evaluation and project timeline extensions requiring full stakeholder alignment.", "attendees": ["emp_sarah", "emp_john", "emp_alice", "emp_bruce", "emp_clark"], "duration": 3.5, "days_ago": 1},
            
            # -- HUMAN REVIEW REQUIRED (Ambiguous title or low confidence triggers) --
            {"id": "m_review1", "title": "Budget discussion & review", "description": "Let's review the general costs of the project we discussed yesterday.", "attendees": ["emp_sarah", "emp_bob", "emp_clark"], "duration": 1.5, "days_ago": 1},
            {"id": "m_review2", "title": "Align on details", "description": "Sync to touch base on details.", "attendees": ["emp_john", "emp_alice"], "duration": 1.0, "days_ago": 0},
        ]
        
        historical_costs = []
        
        # We will process meetings in chronological order (oldest to newest)
        mock_meetings.sort(key=lambda x: x["days_ago"], reverse=True)
        
        for m_data in mock_meetings:
            meet_id = m_data["id"]
            title = m_data["title"]
            desc = m_data["description"]
            duration = m_data["duration"]
            days_ago = m_data["days_ago"]
            
            # Create timestamp
            meeting_time = now - datetime.timedelta(days=days_ago)
            
            # Calculate cost
            attendees = [emp_map[eid] for eid in m_data["attendees"]]
            rates = [emp.hourly_rate for emp in attendees]
            cost = calculate_meeting_cost(duration, rates)
            
            # Run Z-score anomaly detection against historical costs
            z_score, is_anomaly = detect_anomaly(cost, historical_costs)
            
            # Add to historical costs for subsequent calculations
            historical_costs.append(cost)
            
            # Create meeting object
            meeting = Meeting(
                id=meet_id,
                title=title,
                description=desc,
                start_time=meeting_time,
                end_time=meeting_time + datetime.timedelta(hours=duration),
                duration_hours=duration,
                cost=cost,
                is_anomaly=is_anomaly,
                z_score=z_score,
                is_reviewed=False
            )
            
            # Link attendees
            meeting.attendees = attendees
            db.add(meeting)
            db.commit()
            
            # Run AI Attribution
            ai_attrib = attribute_meeting(title, desc, projects_dict)
            
            # Forcing specific seed items to require human review to guarantee demo functionality
            if meet_id in ["m_review1", "m_review2"]:
                requires_review = True
                ai_attrib.confidence_score = 0.58
                ai_attrib.reasoning = "Ambiguous title and lack of description makes it impossible to attribute with high confidence."
            else:
                requires_review = ai_attrib.confidence_score < 0.75
            
            meeting.requires_human_review = requires_review
            db.commit()
            
            # Save Attribution record
            signals_str = ", ".join(ai_attrib.key_signals)
            attribution = MeetingAttribution(
                meeting_id=meet_id,
                project_id=ai_attrib.project_id,
                confidence_score=ai_attrib.confidence_score,
                key_signals=signals_str,
                reasoning=ai_attrib.reasoning,
                attributed_by="ai"
            )
            db.add(attribution)
            db.commit()
            
        print(f"Database successfully seeded with {len(mock_meetings)} meetings!")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
