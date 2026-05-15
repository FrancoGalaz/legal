"""Tests for pdf_extractor.py — file type guessing, text extraction, error handling."""

from io import BytesIO
import pytest
from app.services.pdf_extractor import (
    _guess_content_type,
    extract_text_from_file,
)


@pytest.mark.parametrize(
    ("filename", "expected"),
    [
        ("contrato.pdf", "application/pdf"),
        ("CONTRATO.PDF", "application/pdf"),
        ("documento.txt", "text/plain"),
        ("informe.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("notas.doc", "application/msword"),
        ("image.png", "application/octet-stream"),
        ("noext", "application/octet-stream"),
        (".hidden", "application/octet-stream"),
    ],
)
def test_guess_content_type(filename: str, expected: str):
    """_guess_content_type returns correct MIME type for extensions."""
    assert _guess_content_type(filename) == expected


def test_extract_text_from_txt():
    """Plain text files are read and decoded correctly."""
    content = "Este es un contrato de prueba.\nCláusula 1: confidencialidad."
    bio = BytesIO(content.encode("utf-8"))
    result = extract_text_from_file(bio, "test.txt")
    assert result == content


def test_extract_text_from_txt_unicode():
    """Text files with Unicode characters (ñ, accents) decode without errors."""
    content = "Cláusula de confidencialidad: información reservada.\nArtículo 19 N° 4 CPR."
    bio = BytesIO(content.encode("utf-8"))
    result = extract_text_from_file(bio, "documento.txt")
    assert "confidencialidad" in result
    assert "Artículo" in result


def test_extract_text_from_txt_replaces_bad_bytes():
    """Text files with invalid UTF-8 bytes don't crash — uses errors='replace'."""
    bio = BytesIO(b"texto valido \xff\xfe valido")
    result = extract_text_from_file(bio, "datos.txt")
    # Bad bytes get replaced; text around them survives
    assert "texto valido" in result
    assert "valido" in result


def test_extract_empty_txt():
    """Empty text file returns empty string."""
    bio = BytesIO(b"")
    result = extract_text_from_file(bio, "vacio.txt")
    assert result == ""


def test_unsupported_type_raises_value_error():
    """Unsupported file types raise ValueError with descriptive message."""
    bio = BytesIO(b"not an image")
    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_text_from_file(bio, "photo.png")


def test_unsupported_type_no_extension():
    """Files with no recognizable extension raise ValueError."""
    bio = BytesIO(b"content")
    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_text_from_file(bio, "Makefile")


def test_extract_text_empty_stream_after_consumed():
    """Text extraction does NOT seek — a consumed stream returns empty."""
    bio = BytesIO(b"Hola mundo")
    bio.read()  # consume the stream
    result = extract_text_from_file(bio, "saludo.txt")
    assert result == ""
