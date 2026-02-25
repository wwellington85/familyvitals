from __future__ import annotations

import io
import os
import re
from datetime import datetime, timezone
from typing import Any

import pdfplumber
import pytesseract
import requests
from dateutil import parser as dt_parser
from fastapi import FastAPI, HTTPException
from pdf2image import convert_from_bytes
from pydantic import BaseModel, HttpUrl
from supabase import Client, create_client

app = FastAPI(title="FamilyVitals Extractor")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

LAB_ROW_REGEX = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9\-\s\(\)/%]+?)\s+"
    r"(?P<value>[<>]?[0-9]+(?:\.[0-9]+)?|[A-Za-z]+)"
    r"(?:\s+(?P<unit>[a-zA-Z/%\.]+))?"
    r"(?:\s+(?P<ref_low>[0-9]+(?:\.[0-9]+)?)-(?P<ref_high>[0-9]+(?:\.[0-9]+)?))?"
    r"(?:\s+(?P<flag>H|L|N|U))?$"
)
DATE_REGEX = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})")


class ExtractRequest(BaseModel):
    document_id: str
    signed_pdf_url: HttpUrl


def download_pdf(url: str) -> bytes:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.content


def extract_text(pdf_bytes: bytes) -> str:
    texts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
      for page in pdf.pages:
          page_text = page.extract_text() or ""
          if page_text.strip():
              texts.append(page_text)

    full_text = "\n".join(texts).strip()
    if len(full_text) > 200:
        return full_text

    ocr_pages = convert_from_bytes(pdf_bytes, dpi=220)
    ocr_texts: list[str] = []
    for image in ocr_pages:
        ocr_texts.append(pytesseract.image_to_string(image))
    return "\n".join(ocr_texts)


def infer_effective_datetime(text: str, collected_at: str | None, created_at: str | None) -> str:
    if collected_at:
        return f"{collected_at}T12:00:00+00:00"

    for match in DATE_REGEX.findall(text):
        try:
            parsed = dt_parser.parse(match, dayfirst=False, yearfirst=False)
            return parsed.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            continue

    if created_at:
        try:
            created_dt = dt_parser.parse(created_at)
            return created_dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass

    return datetime.now(timezone.utc).isoformat()


def parse_rows(text: str, effective_datetime: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        normalized = " ".join(line.strip().split())
        if not normalized:
            continue

        match = LAB_ROW_REGEX.match(normalized)
        if not match:
            continue

        group = match.groupdict()
        value_raw = group.get("value")
        value_number = None
        value_text = None
        if value_raw:
            try:
                value_number = float(value_raw.replace("<", "").replace(">", ""))
            except ValueError:
                value_text = value_raw

        ref_low = float(group["ref_low"]) if group.get("ref_low") else None
        ref_high = float(group["ref_high"]) if group.get("ref_high") else None
        flagged = group.get("flag") or "U"

        confidence = 0.45
        if group.get("name"):
            confidence += 0.2
        if value_number is not None or value_text is not None:
            confidence += 0.2
        if group.get("unit"):
            confidence += 0.05
        if ref_low is not None and ref_high is not None:
            confidence += 0.05
        if flagged in {"H", "L", "N"}:
            confidence += 0.05

        rows.append(
            {
                "category": "lab",
                "name": group["name"].strip(),
                "effective_datetime": effective_datetime,
                "value_number": value_number,
                "value_text": value_text,
                "unit": group.get("unit"),
                "reference_low": ref_low,
                "reference_high": ref_high,
                "flagged": flagged,
                "status": "extracted",
                "extraction_confidence": min(confidence, 0.99),
            }
        )

    return rows


def update_document_status(document_id: str, status: str, extracted_json: dict[str, Any] | None = None) -> None:
    payload: dict[str, Any] = {"status": status}
    if extracted_json is not None:
        payload["extracted_json"] = extracted_json

    supabase.table("documents").update(payload).eq("id", document_id).execute()


@app.post("/extract")
def extract(req: ExtractRequest):
    document_resp = (
        supabase.table("documents")
        .select("id, profile_id, collected_at, created_at")
        .eq("id", req.document_id)
        .single()
        .execute()
    )

    document = document_resp.data
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        update_document_status(req.document_id, "extracting")
        pdf_bytes = download_pdf(str(req.signed_pdf_url))
        text = extract_text(pdf_bytes)
        effective_datetime = infer_effective_datetime(text, document.get("collected_at"), document.get("created_at"))
        rows = parse_rows(text, effective_datetime)

        supabase.table("observations").delete().eq("source_document_id", req.document_id).execute()

        if rows:
            payload = [
                {
                    "profile_id": document["profile_id"],
                    "source_document_id": req.document_id,
                    **row,
                }
                for row in rows
            ]
            supabase.table("observations").insert(payload).execute()

        extracted_json = {
            "effective_datetime": effective_datetime,
            "rows": rows,
            "text_excerpt": text[:8000],
        }
        update_document_status(req.document_id, "extracted", extracted_json)

        return {"ok": True, "rows_written": len(rows)}
    except Exception as exc:
        update_document_status(req.document_id, "error", {"error": str(exc)})
        raise HTTPException(status_code=500, detail=str(exc)) from exc
