from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.data_service import get_dashboard_data, refresh_dashboard_data
from services.google_sheets_service import (
    fetch_live_collection,
    connect_google_sheet,
    get_connection_status,
)
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Fast Paisa Collections API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectSheetRequest(BaseModel):
    sheet_url: str
    worksheet_title: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


import traceback

@app.get("/api/dashboard-data")
def dashboard_data():
    try:
        return get_dashboard_data()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="CSV file not found in backend/data/")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e) or repr(e))


@app.post("/api/dashboard-data/refresh")
def refresh():
    return refresh_dashboard_data()


@app.get("/api/live-collection")
def get_live_collection():
    try:
        return fetch_live_collection()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/live-collection/sync")
def sync_live_collection():
    try:
        return fetch_live_collection()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/google-sheets/status")
def google_sheets_status():
    return get_connection_status()


@app.post("/api/google-sheets/connect")
def google_sheets_connect(req: ConnectSheetRequest):
    res = connect_google_sheet(req.sheet_url, req.worksheet_title)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error") or "Failed to connect Google Sheet")
    return res