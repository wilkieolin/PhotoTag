import json
import re
import ollama as ollama_client
from ..config import settings

_client = ollama_client.Client(host=settings.ollama_base_url, timeout=settings.ollama_timeout)

TAGGING_PROMPT = """Analyze this photograph and provide descriptive tags.
Return a JSON object with this exact format:
{
  "tags": ["tag1", "tag2", ...],
  "description": "One sentence description of the image"
}
Rules:
- Provide 5-15 tags
- Tags should be lowercase single words or two-word phrases
- Include: subject matter, setting, mood, colors, weather, activity
- Be specific: prefer "golden retriever" over just "dog" (include both if applicable)
- Do not include tags about image quality or camera settings"""


def generate_tags(image_path: str, max_retries: int = 3) -> dict:
    """Send an image to Ollama qwen3-vl and parse the tag response.

    Returns {"tags": [...], "description": "..."} or raises on failure.
    """
    with open(image_path, "rb") as f:
        image_data = f.read()

    last_error = None
    for attempt in range(max_retries):
        try:
            response = _client.chat(
                model=settings.ollama_model,
                messages=[{
                    "role": "user",
                    "content": TAGGING_PROMPT,
                    "images": [image_data],
                }],
                options={"temperature": 0.3},
                format="json",
            )

            content = response.message.content
            result = _parse_json_response(content)

            if "tags" not in result or not isinstance(result["tags"], list):
                raise ValueError("Response missing 'tags' array")

            # Normalize tags
            result["tags"] = [
                tag.strip().lower()
                for tag in result["tags"]
                if isinstance(tag, str) and tag.strip()
            ]
            result.setdefault("description", "")

            return result

        except Exception as e:
            last_error = e
            continue

    raise RuntimeError(f"Failed to generate tags after {max_retries} attempts: {last_error}")


def _parse_json_response(content: str) -> dict:
    """Parse JSON from model output, handling common formatting issues."""
    content = content.strip()

    # Strip markdown code fences
    if content.startswith("```"):
        lines = content.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        content = "\n".join(lines)

    # Try direct parse first
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the response
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from response: {content[:200]}")
