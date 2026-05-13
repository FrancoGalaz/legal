import logging
from pathlib import Path
from typing import BinaryIO

logger = logging.getLogger(__name__)


def extract_text_from_file(file: BinaryIO, filename: str) -> str:
    content_type = _guess_content_type(filename)

    if content_type == "application/pdf":
        return _extract_pdf(file)
    elif content_type == "text/plain":
        return file.read().decode("utf-8", errors="replace")
    elif content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return _extract_docx(file)
    else:
        raise ValueError(f"Unsupported file type: {content_type}")


def _guess_content_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    elif suffix == ".txt":
        return "text/plain"
    elif suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif suffix == ".doc":
        return "application/msword"
    return "application/octet-stream"


def _extract_pdf(file: BinaryIO) -> str:
    file.seek(0)
    data = file.read()

    # Try PyMuPDF first
    try:
        import fitz  # type: ignore[import-untyped]

        doc = fitz.open(stream=data, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text.strip()
    except ImportError:
        logger.info("PyMuPDF (fitz) not available, trying pdfplumber")
    except Exception as exc:
        logger.warning("PyMuPDF failed: %s, trying pdfplumber", exc)

    # Fallback to pdfplumber
    try:
        import pdfplumber  # type: ignore[import-untyped]

        text_parts: list[str] = []
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts).strip()
    except ImportError:
        logger.error("Neither PyMuPDF nor pdfplumber is installed")
        raise ImportError(
            "PDF extraction requires PyMuPDF or pdfplumber. "
            'Install with: pip install "legal-agent-api[pdf]"'
        )


def _extract_docx(file: BinaryIO) -> str:
    try:
        import docx  # type: ignore[import-untyped]
    except ImportError:
        logger.error("python-docx is not installed")
        raise ImportError(
            "DOCX extraction requires python-docx. "
            'Install with: pip install "legal-agent-api[docx]"'
        )

    file.seek(0)
    document = docx.Document(file)
    paragraphs = [p.text for p in document.paragraphs if p.text]
    return "\n".join(paragraphs).strip()
