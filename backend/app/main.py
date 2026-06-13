import datetime
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import engine, Base, get_db
from .models import Project, Employee, Meeting, MeetingAttribution
from .schemas import (
    ProjectResponse,
    EmployeeResponse,
    MeetingResponse,
    ReviewRequest,
    SyncResponse,
    RateUpdateRequest
)
from .anomaly import calculate_meeting_cost, detect_anomaly
from .ai_service import attribute_meeting
from .seed import seed_db

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR Cost Intelligence Engine API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.get("/api/employees", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total meetings analyzed
    total_meetings = db.query(Meeting).count()
    
    # 2. Total cost of all meetings
    total_cost = db.query(Meeting).with_entities(Meeting.cost).all()
    sum_total_cost = round(sum(c[0] for c in total_cost), 2) if total_cost else 0.0
    
    # 3. Pending reviews
    pending_reviews_count = db.query(Meeting).filter(
        Meeting.requires_human_review == True,
        Meeting.is_reviewed == False
    ).count()
    
    # 4. Active anomalies
    active_anomalies_count = db.query(Meeting).filter(Meeting.is_anomaly == True).count()
    
    # 5. Project Cost Aggregation (for Recharts BarChart)
    projects = db.query(Project).all()
    project_cost_map = {
        p.id: {
            "id": p.id,
            "name": p.name,
            "budget": p.budget,
            "cost": 0.0
        } for p in projects
    }
    
    meetings = db.query(Meeting).all()
    for m in meetings:
        if m.attributions:
            # Sort attributions to find the latest active one
            latest_attrib = sorted(m.attributions, key=lambda a: a.timestamp, reverse=True)[0]
            p_id = latest_attrib.project_id
            if p_id in project_cost_map:
                project_cost_map[p_id]["cost"] = round(project_cost_map[p_id]["cost"] + m.cost, 2)
                
    project_costs_list = list(project_cost_map.values())
    
    # 6. Cost Anomalies Feed
    anomalies_db = db.query(Meeting).filter(Meeting.is_anomaly == True).order_by(Meeting.start_time.desc()).all()
    anomalies_list = []
    for m in anomalies_db:
        attendee_names = [a.name for a in m.attendees]
        # Find attributed project name
        proj_name = "Unattributed"
        if m.attributions:
            latest_attrib = sorted(m.attributions, key=lambda a: a.timestamp, reverse=True)[0]
            proj = db.query(Project).filter(Project.id == latest_attrib.project_id).first()
            if proj:
                proj_name = proj.name
                
        anomalies_list.append({
            "id": m.id,
            "title": m.title,
            "cost": m.cost,
            "z_score": m.z_score,
            "duration_hours": m.duration_hours,
            "start_time": m.start_time,
            "project_name": proj_name,
            "attendees": attendee_names
        })
        
    # 7. Human-in-the-Loop Queue
    review_meetings = db.query(Meeting).filter(
        Meeting.requires_human_review == True,
        Meeting.is_reviewed == False
    ).order_by(Meeting.start_time.desc()).all()
    
    review_queue = []
    for m in review_meetings:
        attendee_names = [a.name for a in m.attendees]
        
        # Get AI attribution details
        latest_attrib = None
        if m.attributions:
            latest_attrib = sorted(m.attributions, key=lambda a: a.timestamp, reverse=True)[0]
            
        review_queue.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "cost": m.cost,
            "duration_hours": m.duration_hours,
            "start_time": m.start_time,
            "attendees": attendee_names,
            "ai_attribution": {
                "project_id": latest_attrib.project_id if latest_attrib else None,
                "confidence_score": latest_attrib.confidence_score if latest_attrib else 0.0,
                "key_signals": latest_attrib.key_signals.split(", ") if latest_attrib and latest_attrib.key_signals else [],
                "reasoning": latest_attrib.reasoning if latest_attrib else "No AI analysis performed."
            }
        })

    # 8. Resolved/Reviewed Queue (Audit Log)
    resolved_meetings = db.query(Meeting).filter(
        Meeting.is_reviewed == True
    ).order_by(Meeting.start_time.desc()).all()
    
    resolved_queue = []
    for m in resolved_meetings:
        attendee_names = [a.name for a in m.attendees]
        
        latest_attrib = None
        if m.attributions:
            latest_attrib = sorted(m.attributions, key=lambda a: a.timestamp, reverse=True)[0]
            
        proj_name = "Unattributed"
        if latest_attrib and latest_attrib.project_id:
            proj = db.query(Project).filter(Project.id == latest_attrib.project_id).first()
            if proj:
                proj_name = proj.name
                
        resolved_queue.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "cost": m.cost,
            "duration_hours": m.duration_hours,
            "start_time": m.start_time,
            "attendees": attendee_names,
            "attribution": {
                "project_id": latest_attrib.project_id if latest_attrib else None,
                "project_name": proj_name,
                "confidence_score": latest_attrib.confidence_score if latest_attrib else 1.0,
                "reasoning": latest_attrib.reasoning if latest_attrib else "No reasoning provided.",
                "attributed_by": latest_attrib.attributed_by if latest_attrib else "human"
            }
        })
        
    # 9. All Meetings for Calendar View
    all_db_meetings = db.query(Meeting).order_by(Meeting.start_time.desc()).all()
    all_meetings_list = []
    for m in all_db_meetings:
        attendee_names = [a.name for a in m.attendees]
        
        latest_attrib = None
        if m.attributions:
            latest_attrib = sorted(m.attributions, key=lambda a: a.timestamp, reverse=True)[0]
            
        proj_name = "Unattributed"
        proj_id = None
        if latest_attrib and latest_attrib.project_id:
            proj = db.query(Project).filter(Project.id == latest_attrib.project_id).first()
            if proj:
                proj_name = proj.name
                proj_id = proj.id
                
        if m.is_reviewed:
            status = "audited"
        elif m.is_anomaly:
            status = "anomaly"
        elif m.requires_human_review:
            status = "pending"
        else:
            status = "auto_assigned"
            
        all_meetings_list.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "cost": m.cost,
            "duration_hours": m.duration_hours,
            "start_time": m.start_time.isoformat(),
            "attendees": attendee_names,
            "project_id": proj_id,
            "project_name": proj_name,
            "status": status
        })
        
    return {
        "stats": {
            "total_meetings": total_meetings,
            "total_cost": sum_total_cost,
            "pending_reviews": pending_reviews_count,
            "active_anomalies": active_anomalies_count
        },
        "project_costs": project_costs_list,
        "anomalies": anomalies_list,
        "review_queue": review_queue,
        "resolved_queue": resolved_queue,
        "all_meetings": all_meetings_list
    }

@app.post("/api/meetings/{meeting_id}/review")
def review_meeting(meeting_id: str, payload: ReviewRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=400, detail="Invalid project_id")
        
    # Create human attribution record
    new_attribution = MeetingAttribution(
        meeting_id=meeting.id,
        project_id=project.id,
        confidence_score=1.0,
        key_signals="human_confirmation",
        reasoning=payload.reasoning or "Confirmed by manager.",
        attributed_by="human"
    )
    db.add(new_attribution)
    
    # Mark meeting as reviewed and no longer requiring human review
    meeting.is_reviewed = True
    meeting.requires_human_review = False
    
    db.commit()
    return {"status": "success", "message": f"Meeting {meeting_id} attributed to {project.name}"}

@app.get("/api/meetings/sync", response_model=SyncResponse)
def sync_meetings(sync_token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """
    Simulates Google Calendar Incremental Sync pattern.
    - No token: Returns existing meetings, next token is 'token_initial'
    - 'token_initial': Adds phase 1 meetings (normal), next token 'token_phase_2'
    - 'token_phase_2': Adds phase 2 meetings (high cost cybersecurity anomaly), next token 'token_phase_3'
    - 'token_phase_3': Adds phase 3 meetings (ambiguous title, review queue), next token 'token_phase_4'
    - Any other token: Returns empty list
    """
    new_meetings_data = []
    next_token = "token_initial"
    
    if sync_token == "token_initial":
        new_meetings_data = [
            {
                "id": "sync_m1",
                "title": "Apollo Engine Hot-Fire Test Review",
                "description": "Evaluate telemetry data from the rocket booster test burn.",
                "attendees": ["emp_john", "emp_alice", "emp_tim"],
                "duration": 2.0,
                "days_ago": 0
            },
            {
                "id": "sync_m2",
                "title": "Q3 Marketing Campaign Content Sync",
                "description": "Review ad designs for Instagram and LinkedIn campaigns.",
                "attendees": ["emp_bob", "emp_alice"],
                "duration": 1.0,
                "days_ago": 0
            }
        ]
        next_token = "token_phase_2"
    elif sync_token == "token_phase_2":
        new_meetings_data = [
            {
                "id": "sync_m_anomaly",
                "title": "CRITICAL: Database Ransomware Threat Audit",
                "description": "All hands security incident response to patch internal firewalls and scan server access logs.",
                "attendees": ["emp_sarah", "emp_john", "emp_bruce", "emp_tim", "emp_clark", "emp_alice"],
                "duration": 6.0,
                "days_ago": 0
            },
            {
                "id": "sync_m3",
                "title": "Operations Weekly Office Sync",
                "description": "Discussing desk spacing and snack inventory.",
                "attendees": ["emp_clark", "emp_bob"],
                "duration": 1.0,
                "days_ago": 0
            }
        ]
        next_token = "token_phase_3"
    elif sync_token == "token_phase_3":
        new_meetings_data = [
            {
                "id": "sync_m_review",
                "title": "Touch base about resources",
                "description": "Quick check-in to discuss allocation and budgets.",
                "attendees": ["emp_john", "emp_bob", "emp_clark"],
                "duration": 1.5,
                "days_ago": 0
            }
        ]
        next_token = "token_phase_4"
    elif sync_token and sync_token.startswith("token_phase_"):
        # No new meetings, simulation complete
        return SyncResponse(events=[], nextSyncToken=sync_token)
        
    # If no sync token, we return all existing meetings currently in database
    if not sync_token:
        all_meetings = db.query(Meeting).all()
        return SyncResponse(events=all_meetings, nextSyncToken="token_initial")
        
    # Process and save new meetings
    employees = db.query(Employee).all()
    emp_map = {e.id: e for e in employees}
    
    projects = db.query(Project).all()
    projects_dict = [{"id": p.id, "name": p.name, "description": p.description} for p in projects]
    
    # Query database for all existing meeting costs to run standard deviation/mean
    existing_costs = [m[0] for m in db.query(Meeting.cost).all()]
    
    returned_meetings = []
    
    now = datetime.datetime.utcnow()
    
    for m_data in new_meetings_data:
        # Check if meeting already exists to avoid duplicates
        existing_m = db.query(Meeting).filter(Meeting.id == m_data["id"]).first()
        if existing_m:
            returned_meetings.append(existing_m)
            continue
            
        attendees = [emp_map[eid] for eid in m_data["attendees"] if eid in emp_map]
        rates = [emp.hourly_rate for emp in attendees]
        cost = calculate_meeting_cost(m_data["duration"], rates)
        
        # Calculate Z-score
        z_score, is_anomaly = detect_anomaly(cost, existing_costs)
        existing_costs.append(cost)
        
        meeting = Meeting(
            id=m_data["id"],
            title=m_data["title"],
            description=m_data["description"],
            start_time=now,
            end_time=now + datetime.timedelta(hours=m_data["duration"]),
            duration_hours=m_data["duration"],
            cost=cost,
            is_anomaly=is_anomaly,
            z_score=z_score,
            is_reviewed=False
        )
        meeting.attendees = attendees
        db.add(meeting)
        db.commit()
        
        # AI Attribution
        ai_attrib = attribute_meeting(m_data["title"], m_data["description"], projects_dict)
        
        # Force specific sync demo meeting to require review
        if m_data["id"] == "sync_m_review":
            requires_review = True
            ai_attrib.confidence_score = 0.61
            ai_attrib.reasoning = "Resource sync details are too generic to map to a single project."
        else:
            requires_review = ai_attrib.confidence_score < 0.75
        
        meeting.requires_human_review = requires_review
        db.commit()
        
        signals_str = ", ".join(ai_attrib.key_signals)
        attribution = MeetingAttribution(
            meeting_id=meeting.id,
            project_id=ai_attrib.project_id,
            confidence_score=ai_attrib.confidence_score,
            key_signals=signals_str,
            reasoning=ai_attrib.reasoning,
            attributed_by="ai"
        )
        db.add(attribution)
        db.commit()
        
        returned_meetings.append(meeting)
        
    return SyncResponse(events=returned_meetings, nextSyncToken=next_token)

@app.post("/api/employees/{employee_id}/rate")
def update_employee_rate(employee_id: str, payload: RateUpdateRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update hourly rate
    employee.hourly_rate = payload.hourly_rate
    db.commit()
    
    # Dynamic Recalculation: update cost for all meetings this employee attends that are NOT reviewed yet
    for meeting in employee.meetings:
        if not meeting.is_reviewed:
            rates = [a.hourly_rate for a in meeting.attendees]
            meeting.cost = calculate_meeting_cost(meeting.duration_hours, rates)
            
            # Recalculate anomaly status based on new cost
            other_costs = [m[0] for m in db.query(Meeting.cost).filter(Meeting.id != meeting.id).all()]
            z_score, is_anomaly = detect_anomaly(meeting.cost, other_costs)
            meeting.z_score = z_score
            meeting.is_anomaly = is_anomaly
            db.commit()
            
    return {"status": "success", "message": f"Hourly rate for {employee.name} updated to {payload.hourly_rate}"}

@app.post("/api/meetings/{meeting_id}/unreview")
def unreview_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting.is_reviewed = False
    meeting.requires_human_review = True
    db.commit()
    return {"status": "success", "message": f"Meeting {meeting_id} moved back to review queue."}

@app.post("/api/admin/reset")
def reset_database(db: Session = Depends(get_db)):
    try:
        seed_db()
        return {"status": "success", "message": "Database successfully reset and re-seeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
