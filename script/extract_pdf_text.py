import base64
import io
import sys


def extract_with_pypdf(data: bytes) -> str:
    import pypdf

    reader = pypdf.PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def extract_with_pypdf2(data: bytes) -> str:
    import PyPDF2

    reader = PyPDF2.PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def extract_with_pymupdf(data: bytes) -> str:
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    parts = []
    for page in doc:
        text = page.get_text("text") or ""
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def extract_with_ocr(data: bytes) -> str:
    import fitz
    import pytesseract
    from PIL import Image

    doc = fitz.open(stream=data, filetype="pdf")
    parts = []
    max_pages = min(len(doc), 5)
    for i in range(max_pages):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = pytesseract.image_to_string(img, lang="eng")
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def main() -> int:
    payload = sys.stdin.read()
    if not payload.strip():
        sys.stderr.write("No input received\n")
        return 1

    try:
        pdf_data = base64.b64decode(payload)
    except Exception as exc:
        sys.stderr.write(f"Invalid base64 input: {exc}\n")
        return 1

    text = ""
    errors = []
    for extractor in (extract_with_pypdf, extract_with_pypdf2, extract_with_pymupdf, extract_with_ocr):
        try:
            text = extractor(pdf_data)
            if text:
                break
        except Exception as exc:
            errors.append(str(exc))

    if not text:
        joined = "; ".join(errors) if errors else "Unknown extraction failure"
        sys.stderr.write(f"PDF extraction failed: {joined}\n")
        return 1

    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
