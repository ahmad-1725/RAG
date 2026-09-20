import re


def is_heading(text: str, font_size: float, flags: int, body_font_size: float) -> bool:
    """
    Determine whether a piece of text is likely to be a heading.
    """

    text = text.strip()

    if not text:
        return False

    # Ignore extremely long text blocks
    if len(text) > 150:
        return False

    # PyMuPDF bold flag
    is_bold = bool(flags & 16)

    # Numbered headings:
    # 1 Introduction
    # 1.1 Supervised Learning
    # 2.3.1 Decision Trees
    numbered_heading = bool(
        re.match(r"^\d+(\.\d+)*\.?\s+\S+", text)
    )

    # Chapter / Section style headings
    named_heading = bool(
        re.match(
            r"^(chapter|section|part)\s+\d+",
            text,
            re.IGNORECASE
        )
    )

    # Font significantly larger than body text
    large_font = font_size >= body_font_size * 1.15

    return (
        large_font
        or is_bold and (numbered_heading or named_heading)
        or numbered_heading
        or named_heading
    )

def get_body_font_size(pages):
    """
    Find the most common font size in the document.
    """

    font_sizes = []

    for page in pages:

        for block in page["blocks"]:

            size = block.get("size")

            if size:
                font_sizes.append(round(size, 1))

    if not font_sizes:
        return 11.0

    from collections import Counter

    counter = Counter(font_sizes)

    return counter.most_common(1)[0][0]

def extract_headings(pages):
    body_font_size = get_body_font_size(pages)

    headings = []

    for page in pages:

        for block_index, block in enumerate(page["blocks"]):

            text = block["text"].strip()

            if not text:
                continue

            if is_heading(
                text,
                block["size"],
                block["flags"],
                body_font_size
            ):
                headings.append({
                    "text": text,
                    "page_number": page["page_number"],
                    "block_index": block_index,
                    "font_size": block["size"],
                    "flags": block["flags"]
                })

    return assign_heading_levels(headings)

def get_heading_level(text: str) -> int:
    """
    Determine heading hierarchy from numbering.

    Examples:
    1 Introduction          -> 1
    1.1 Background          -> 2
    1.1.1 Regression        -> 3
    """

    match = re.match(
        r"^(\d+(?:\.\d+)*)\.?\s+",
        text.strip()
    )

    if match:
        number = match.group(1)
        return number.count(".") + 1

    # Non-numbered headings
    return 1

def assign_heading_levels(headings):
    """
    Assign hierarchy levels based on heading font sizes.

    Larger heading fonts become higher-level headings.
    """

    if not headings:
        return headings

    # Get unique font sizes, largest first
    sizes = sorted(
        set(round(h["font_size"], 1) for h in headings),
        reverse=True
    )

    size_to_level = {
        size: index + 1
        for index, size in enumerate(sizes)
    }

    for heading in headings:
        heading["level"] = size_to_level[
            round(heading["font_size"], 1)
        ]

    return headings

def build_heading_tree(headings):
    """
    Convert a flat list of headings into a hierarchical tree.
    """

    root = []
    stack = []

    for heading in headings:

        node = {
            "text": heading["text"],
            "page_number": heading["page_number"],
            "level": heading["level"],
            "children": []
        }

        # Remove headings that are no longer parents
        while stack and stack[-1]["level"] >= heading["level"]:
            stack.pop()

        if stack:
            stack[-1]["children"].append(node)
        else:
            root.append(node)

        stack.append(node)

    return root

def build_sections(headings, pages):
    """
    Build sections using the position of headings within pages.
    """

    sections = []

    # Create quick lookup for page blocks
    page_blocks = {
        page["page_number"]: page["blocks"]
        for page in pages
    }

    for index, heading in enumerate(headings):

        start_page = heading["page_number"]
        start_block = heading["block_index"]

        # Determine where the next heading begins
        if index + 1 < len(headings):

            next_heading = headings[index + 1]

            end_page = next_heading["page_number"]
            end_block = next_heading["block_index"]

        else:

            end_page = max(page_blocks.keys())
            end_block = len(page_blocks[end_page])

        content_parts = []

        # Same-page section
        if start_page == end_page:

            blocks = page_blocks[start_page]

            for block in blocks[start_block + 1:end_block]:
                content_parts.append(block["text"])

        # Section spans multiple pages
        else:

            # Remaining blocks on starting page
            blocks = page_blocks[start_page]

            for block in blocks[start_block + 1:]:
              content_parts.append(block["text"])

            # Complete pages in between
            for page_number in range(start_page + 1, end_page):
                for block in page_blocks[page_number]:
                    content_parts.append(block["text"])

            # Blocks before next heading
            blocks = page_blocks[end_page]

            for block in blocks[:end_block]:
                content_parts.append(block["text"])

        sections.append({
            "title": heading["text"],
            "level": heading["level"],
            "page_start": start_page,
            "page_end": end_page,
            "content": clean_section_text("\n".join(content_parts))
        })

    return sections

def clean_section_text(text: str) -> str:
    """
    Clean extracted PDF text while preserving paragraph structure.
    """

    lines = text.splitlines()

    cleaned = []

    for line in lines:

        line = line.strip()

        if not line:
            continue

        # Remove invisible characters often produced by PDFs
        line = line.replace("\u200b", "")
        line = line.replace("\ufeff", "")

        # Normalize whitespace
        line = re.sub(r"\s+", " ", line)

        cleaned.append(line)

    return "\n".join(cleaned)

def chunk_section(section, max_chars=1200):
    """
    Split a section into reasonably sized chunks
    while preserving line/paragraph boundaries.
    """

    lines = section["content"].split("\n")

    chunks = []
    current_chunk = []
    current_length = 0

    for line in lines:

        line = line.strip()

        if not line:
            continue

        line_length = len(line)

        # If adding this line would exceed the limit,
        # save the current chunk first.
        if (
            current_chunk
            and current_length + line_length > max_chars
        ):
            chunks.append("\n".join(current_chunk))

            current_chunk = []
            current_length = 0

        current_chunk.append(line)
        current_length += line_length

    # Add remaining content
    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def chunk_section(section, max_chars=1200):
    """
    Split a section into reasonably sized chunks
    while preserving line/paragraph boundaries.
    """

    lines = section["content"].split("\n")

    chunks = []
    current_chunk = []
    current_length = 0

    for line in lines:

        line = line.strip()

        if not line:
            continue

        line_length = len(line)

        # If adding this line would exceed the limit,
        # save the current chunk first.
        if (
            current_chunk
            and current_length + line_length > max_chars
        ):
            chunks.append("\n".join(current_chunk))

            current_chunk = []
            current_length = 0

        current_chunk.append(line)
        current_length += line_length

    # Add remaining content
    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks

def build_chunks(sections):
    """
    Create chunks for all document sections.
    """

    chunks = []

    for section_index, section in enumerate(sections):

        section_chunks = chunk_section(section)

        for chunk_index, content in enumerate(section_chunks):

            chunks.append({
                "chunk_id": len(chunks),
                "section_index": section_index,
                "section_title": section["title"],
                "level": section["level"],
                "page_start": section["page_start"],
                "page_end": section["page_end"],
                "chunk_index": chunk_index,
                "content": content
            })

    return chunks