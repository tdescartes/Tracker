"""
OCR Service — PaddleOCR-powered receipt text extraction.

Pipeline:
  1. PaddleOCR  (free, offline, high accuracy — primary)
  2. Tesseract  (free, offline, less accurate — last-resort fallback)

Raw text is then structured by Gemini 1.5 Flash (see ai_document_service.py).
"""
import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def run_ocr(image_path_or_url: str) -> str:
    """Returns raw extracted text from a receipt image."""

    # PaddleOCR (free, high accuracy, CPU-only)
    if settings.USE_PADDLEOCR:
        try:
            return _paddleocr(image_path_or_url)
        except Exception as exc:
            logger.warning("PaddleOCR failed, falling back to Tesseract: %s", exc)

    # Fallback: Tesseract (local, synchronous)
    return _tesseract_ocr(image_path_or_url)


# ── PaddleOCR (Free / High Accuracy / CPU) ────────────────────
def _paddleocr(image_path: str) -> str:
    from paddleocr import PaddleOCR

    ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
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
