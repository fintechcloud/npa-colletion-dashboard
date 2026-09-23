import json
from pathlib import Path
from datetime import date, timedelta

SNAPSHOT_DIR = Path(__file__).parent.parent / "data" / "snapshots"
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def _snapshot_path(day: date) -> Path:
    return SNAPSHOT_DIR / f"{day.strftime('%Y-%m-%d')}.json"


def save_todays_snapshot(loan_records: list[dict]) -> None:
    """
    loan_records: list of {"loan_no": str, "agent": str, "leader": str, "recvd": int}
    Only writes if today's snapshot doesn't already exist — so calling this
    repeatedly throughout the day (every time the cache refreshes) doesn't
    overwrite the morning's baseline with a later, higher number.
    """
    path = _snapshot_path(date.today())
    if path.exists():
        return
    with open(path, "w") as f:
        json.dump(loan_records, f)


def compute_daily_collection(target_day: date) -> dict | None:
    """
    Returns the true amount collected ON target_day, by diffing the
    snapshot taken that day against the snapshot from the day before.
    Returns None if either snapshot is missing (not enough history yet).
    """
    today_path = _snapshot_path(target_day)
    prev_path = _snapshot_path(target_day - timedelta(days=1))

    if not today_path.exists() or not prev_path.exists():
        return None

    with open(today_path) as f:
        today_records = json.load(f)
    with open(prev_path) as f:
        prev_records = {r["loan_no"]: r["recvd"] for r in json.load(f)}

    total_delta = 0
    by_agent = {}

    for r in today_records:
        loan_no = r["loan_no"]
        prev_recvd = prev_records.get(loan_no, 0)
        delta = r["recvd"] - prev_recvd
        if delta <= 0:
            continue
        total_delta += delta
        agent = r["agent"]
        by_agent[agent] = by_agent.get(agent, 0) + delta

    return {
        "date": target_day.strftime('%Y-%m-%d'),
        "totalCollected": total_delta,
        "byAgent": by_agent,
    }