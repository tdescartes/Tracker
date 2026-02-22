"""
OCR Service — PaddleOCR-powered text extraction (singleton engine).

Pipeline:
  1. PaddleOCR  (free, offline, high accuracy — primary)
  2. Tesseract  (free, offline, less accurate — last-resort fallback)

Raw text is then structured by Gemini Flash (see ai_document_service.py).
The PaddleOCR engine is created ONCE as a module-level singleton to avoid
re-loading ~100MB of model weights on every request.
"""
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# ── PaddleOCR Singleton ───────────────────────────────────────
# Created lazily on first use, then reused for all subsequent calls.
_paddleocr_engine = None


def _get_paddleocr():
    """Return the singleton PaddleOCR engine, creating it on first call."""
    global _paddleocr_engine
    if _paddleocr_engine is None:
        from paddleocr import PaddleOCR
        logger.info("Initializing PaddleOCR engine (one-time, ~5s)...")
        _paddleocr_engine = PaddleOCR(
            use_angle_cls=True, lang="en", use_gpu=False, show_log=False
        )
        logger.info("PaddleOCR engine ready.")
    return _paddleocr_engine


def run_ocr_sync(image_path: str) -> str:
    """
    Synchronous OCR extraction.  Used by ai_document_service.extract_text_from_file().
    Returns raw extracted text from an image or scanned PDF.
    """
    if settings.USE_PADDLEOCR:
        try:
            return _paddleocr(image_path)
        except Exception as exc:
            logger.warning("PaddleOCR failed, falling back to Tesseract: %s", exc)

    return _tesseract_ocr(image_path)


async def run_ocr(image_path_or_url: str) -> str:
    """Async wrapper — runs CPU-bound OCR in a thread to avoid blocking the event loop."""
    import asyncio
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, run_ocr_sync, image_path_or_url)


# ── PaddleOCR (Free / High Accuracy / CPU) ────────────────────
def _paddleocr(image_path: str) -> str:
    ocr = _get_paddleocr()
    result = ocr.ocr(image_path, cls=True)
    if not result:
        return ""
    lines = []
    for page in result:
        if page:
            for line in page:
                lines.append(line[1][0])
    return "\n".join(lines)


# ── Tesseract (Free / Last-resort fallback) ───────────────────
def _tesseract_ocr(image_path: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except ImportError:
        raise RuntimeError(
            "No OCR engine available. Install PaddleOCR: pip install paddleocr paddlepaddle\n"
            "Or Tesseract: pip install pytesseract Pillow + Tesseract binary"
        )
