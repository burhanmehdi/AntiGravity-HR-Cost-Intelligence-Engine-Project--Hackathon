import os
import json
import logging
from openai import OpenAI
from typing import List, Dict, Any
from dotenv import load_dotenv
from .schemas import AIProjectAttribution

# Load env variables from .env file
load_dotenv()

# Configure logger
logger = logging.getLogger(__name__)

# Initialize OpenAI client if API key is provided
api_key = os.getenv("OPENAI_API_KEY")
client = None
if api_key:
    client = OpenAI(api_key=api_key)
    logger.info("OpenAI client initialized successfully.")
else:
    logger.warning("OPENAI_API_KEY not found. Operating in Mock AI Attribution Mode.")

def get_projects_context(projects: List[Dict[str, Any]]) -> str:
    """Formats projects details to provide context to the LLM or Mock Engine."""
    context = "Available Projects:\n"
    for proj in projects:
        context += f"- ID: {proj['id']}, Name: {proj['name']}, Description: {proj['description']}\n"
    return context

def mock_attribute_meeting(title: str, description: str, projects: List[Dict[str, Any]]) -> AIProjectAttribution:
    """
    Intelligent mock attribution based on keyword matching.
    Provides realistic confidence scores and reasoning.
    """
    title_lower = title.lower()
    desc_lower = (description or "").lower()
    combined_text = f"{title_lower} {desc_lower}"
    
    best_project_id = None
    max_score = 0
    matched_signals = []
    
    # Simple keyword heuristic
    for proj in projects:
        proj_id = proj["id"]
        proj_name = proj["name"].lower()
        proj_desc = (proj["description"] or "").lower()
        
        score = 0
        signals = []
        
        # Check direct project name matches
        if proj_name in combined_text:
            score += 5
            signals.append(proj["name"])
            
        # Check project ID matches
        if proj_id.lower() in combined_text:
            score += 5
            signals.append(proj_id)
            
        # Check associated keywords/descriptors
        keywords = {
            "proj_apollo": ["apollo", "space", "moon", "launch", "rocket", "orbit"],
            "proj_zeus": ["zeus", "security", "firewall", "encryption", "auth", "login", "cybersecurity"],
            "proj_marketing": ["marketing", "ad ", "campaign", "social", "branding", "sales", "funnel", "seo"],
            "proj_operations": ["operations", "admin", "recruiting", "hr ", "payroll", "office", "internal", "meeting", "sync"],
            "proj_athena": ["athena", "ai ", "ml ", "model", "llm", "agent", "machine learning", "nlp", "chatbot"]
        }
        
        proj_keywords = keywords.get(proj_id, [])
        for kw in proj_keywords:
            if kw in combined_text:
                score += 3
                signals.append(kw.strip())
                
        if score > max_score:
            max_score = score
            best_project_id = proj_id
            matched_signals = list(set(signals))
            
    # Default attribution if no project matches
    if not best_project_id and projects:
        best_project_id = projects[-1]["id"]  # usually Operations or general
        matched_signals = ["generic sync"]
        
    # Calculate confidence score based on match strength
    if max_score >= 10:
        confidence = 0.95
        reasoning = f"Strong project keywords match: '{', '.join(matched_signals)}' directly matches the project details for {best_project_id}."
    elif max_score >= 5:
        confidence = 0.82
        reasoning = f"Moderate semantic signals detected: '{', '.join(matched_signals)}' maps to project {best_project_id}."
    elif max_score >= 3:
        confidence = 0.68  # Will trigger human review (< 0.75)
        reasoning = f"Weak signals detected. The meeting details suggest a link to {best_project_id} but require human confirmation."
    else:
        confidence = 0.45  # Will trigger human review (< 0.75)
        reasoning = "Ambiguous meeting title and description. Attributed to the default project. Requires human manager to review and reassign."
        
    return AIProjectAttribution(
        project_id=best_project_id,
        confidence_score=confidence,
        key_signals=matched_signals if matched_signals else ["default"],
        reasoning=reasoning
    )

def attribute_meeting(title: str, description: str, projects: List[Dict[str, Any]]) -> AIProjectAttribution:
    """
    Attributes a meeting to one of the projects.
    Uses OpenAI Structured Outputs if API key is present, otherwise falls back to intelligent mock.
    """
    if not client:
        return mock_attribute_meeting(title, description, projects)
        
    projects_str = get_projects_context(projects)
    
    system_prompt = (
        "You are an AI Cost Attribution Engine. Your task is to analyze employee calendar meeting details "
        "and attribute the meeting to the most relevant internal company project.\n"
        "You must return a structured output matching the AIProjectAttribution schema.\n\n"
        f"{projects_str}\n"
        "Ensure you select a project_id exactly matching one of the available project IDs. "
        "If the meeting doesn't map clearly or you have low confidence, output a lower confidence_score (e.g. below 0.75)."
    )
    
    user_prompt = f"Meeting Title: {title}\nMeeting Description: {description or 'No description provided.'}"
    
    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=AIProjectAttribution,
            temperature=0.0
        )
        parsed_response = response.choices[0].message.parsed
        if parsed_response:
            return parsed_response
        else:
            raise ValueError("No parsed content returned from OpenAI.")
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}. Falling back to mock attribution.")
        return mock_attribute_meeting(title, description, projects)
