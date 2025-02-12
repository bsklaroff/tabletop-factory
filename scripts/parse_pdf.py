import argparse
import pymupdf  # type: ignore[import-untyped]


def parse_pdf(pdf_path: str) -> None:
    doc = pymupdf.open(pdf_path)
    for i, pg in enumerate(doc):
        print(pg.get_text())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('filepath')
    args = parser.parse_args()
    parse_pdf(args.filepath)
