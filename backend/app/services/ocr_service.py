"""
OCR Service — abstraction over multiple OCR backends.

Priority order:
  1. Veryfi API    (most accurate for receipts, paid)
  2. Google Vision (accurate, paid)
  3. Tesseract     (free, offline, less accurate — good for development)
"""
import httpx
import base64
from app.config import settings


async def run_ocr(image_path_or_url: str) -> str:
    """Returns raw extracted text from a receipt image."""

    if settings.VERYFI_CLIENT_ID and settings.VERYFI_API_KEY:
        return await _veryfi_ocr(image_path_or_url)

    if settings.GOOGLE_CLOUD_VISION_API_KEY:
        return await _google_vision_ocr(image_path_or_url)

    # Fallback: Tesseract (local, synchronous)
    return _tesseract_ocr(image_path_or_url)


# ── Tesseract (Free / Dev) ────────────────────────────────────
def _tesseract_ocr(image_path: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except ImportError:
        raise RuntimeError(
            "pytesseract or Pillow not installed. Run: pip install pytesseract Pillow\n"
            "Also install Tesseract binary: https://github.com/tesseract-ocr/tesseract"
        )


# ── Google Cloud Vision ───────────────────────────────────────
async def _google_vision_ocr(image_path: str) -> str:
    with open(image_path, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")

    url = f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_CLOUD_VISION_API_KEY}"
    payload = {
        "requests": [{
            "image": {"content": content},
            "features": [{"type": "TEXT_DETECTION"}],
        }]
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()

    annotations = data["responses"][0].get("textAnnotations", [])
    return annotations[0]["description"] if annotations else ""


# ── Veryfi (Most Accurate for Receipts) ──────────────────────
async def _veryfi_ocr(image_path: str) -> str:
    with open(image_path, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")

    headers = {
        "CLIENT-ID": settings.VERYFI_CLIENT_ID,
        "AUTHORIZATION": f"apikey {settings.VERYFI_USERNAME}:{settings.VERYFI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "file_data": content,
        "file_name": "receipt.jpg",
        "categories": ["Groceries"],
        "auto_delete": True,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.veryfi.com/api/v8/partner/documents/",
            json=payload,
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

    # Veryfi returns structured data — convert to raw text for our unified parser
    lines = [f"{item['description']}  {item['total']}" for item in data.get("line_items", [])]
    lines.insert(0, data.get("vendor", {}).get("name", ""))
    lines.append(f"TOTAL  {data.get('total', '')}")
    return "\n".join(str(l) for l in lines)
