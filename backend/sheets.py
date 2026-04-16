"""
Sample Google Sheet Structure (First Tab):

| id | name                  | description                                  | status      |
|----|-----------------------|----------------------------------------------|-------------|
| 1  | AI Sales Coach        | An AI agent that listens to Gong calls...    | complete    |
| 2  | SaaS Pricing Optimizer| Tool to dynamically adjust SaaS pricing...   | validating  |
| 3  | Dev Productivity Track| Integrates with GitHub and Jira...           |             |

Note: The system reads columns strictly in order.
"""

import os
import logging
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_credentials():
    import json
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        creds_dict = json.loads(creds_json)
        return Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    else:
        return Credentials.from_service_account_file(os.getenv("GOOGLE_CREDENTIALS_PATH"), scopes=SCOPES)

def get_ideas_from_sheet():
    sheet_id = os.getenv('GOOGLE_SHEETS_ID')
    
    if not sheet_id:
        raise ValueError("Missing GOOGLE_SHEETS_ID in .env")
        
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)
    
    # 1. Get the first sheet's name dynamically.
    sheet_metadata = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    sheets = sheet_metadata.get('sheets', '')
    if not sheets:
        return []
    first_sheet_title = sheets[0].get("properties", {}).get("title", "Sheet1")
    
    # 2. Get values from the first sheet (Columns A through E).
    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{first_sheet_title}!A:E"
    ).execute()
    
    values = result.get('values', [])
    if not values:
        return []
        
    # Skip the header row
    data_rows = values[1:]
    
    ideas = []
    for row in data_rows:
        # Pad row to guarantee length of 4
        row = row + [""] * (4 - len(row))
        idea_id = str(row[0]).strip()
        name = str(row[1]).strip()
        description = str(row[2]).strip() if str(row[2]).strip() else None
        status = str(row[3]).strip() if str(row[3]).strip() else "unvalidated"
        
        # Skip empty rows that have no meaningful id or name
        if not idea_id and not name:
            continue
            
        validation_result = None
        priority = 0.0
        
        # Parse JSON if Column E exists and has data
        if len(row) > 4 and row[4].strip():
            import json
            try:
                validation_result = json.loads(row[4].strip())
                priority = validation_result.get("viability", {}).get("priority_score", 0.0)
            except Exception:
                pass
                
        ideas.append({
            "id": idea_id,
            "name": name,
            "description": description,
            "status": status,
            "priority": priority,
            "validation_result": validation_result
        })
        
    return ideas

def get_idea_by_id(idea_id: str):
    ideas = get_ideas_from_sheet()
    for idea in ideas:
        if idea["id"] == str(idea_id):
            return idea
    return None

import json
def update_sheet_with_result(idea_id: str, status: str, validation_json: dict):
    sheet_id = os.getenv('GOOGLE_SHEETS_ID')
    
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)
    
    sheet_metadata = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    first_sheet_title = sheet_metadata['sheets'][0]['properties']['title']
    
    # Needs to find the row index again
    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{first_sheet_title}!A:A"
    ).execute()
    
    values = result.get('values', [])
    row_index = -1
    # 1-indexed for sheets, +1 for 0-indexing of array, but array has header at 0.
    # So index i in array means row i+1 in sheet.
    for i, row in enumerate(values):
        if row and row[0].strip() == str(idea_id):
            row_index = i + 1
            break
            
    if row_index == -1:
        raise ValueError(f"Idea ID {idea_id} not found in sheet.")
        
    # Update Column D (status) and E (validation_result)
    body = {
        'values': [[status, json.dumps(validation_json)]]
    }
    
    service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"{first_sheet_title}!D{row_index}:E{row_index}",
        valueInputOption="RAW",
        body=body
    ).execute()

def add_idea_to_sheet(name: str, description: str):
    sheet_id = os.getenv('GOOGLE_SHEETS_ID')
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)
    
    sheet_metadata = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    first_sheet_title = sheet_metadata['sheets'][0]['properties']['title']
    
    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{first_sheet_title}!A:A"
    ).execute()
    
    values = result.get('values', [])
    
    max_id = 0
    # Process rows skip header
    for row in values[1:]:
        if row and row[0].strip().isdigit():
            val = int(row[0].strip())
            if val > max_id:
                max_id = val
                
    new_id = max_id + 1
    
    body = {
        'values': [[str(new_id), name, description if description else "", ""]]
    }
    
    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=f"{first_sheet_title}!A:D",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body=body
    ).execute()
    
    return {
        "id": str(new_id),
        "name": name,
        "description": description if description else "",
        "status": "unvalidated"
    }
