"""
Web search and source-tier classification support.

Supports:
1. Native hosted web search for OpenAI Responses API (extracting annotations).
2. Live web search for Groq and fallback modes via DuckDuckGo / Tavily with zero required API keys.
3. Source credibility classification: Tier 1 (official docs/standards/papers),
   Tier 2 (IEEE/ACM/academic), Tier 3 (general web).
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request
import warnings

warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*renamed to.*")

import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Source-tier classification
# ---------------------------------------------------------------------------

_TIER1_PATTERNS = [
    r"\.gov(\.|/|$)",
    r"\.mil(\.|/|$)",
    r"arxiv\.org",
    r"(^|\.)nist\.gov",
    r"(^|\.)w3\.org",
    r"(^|\.)iso\.org",
    r"(^|\.)ietf\.org",
    r"(^|\.)rfc-editor\.org",
    r"docs\.python\.org",
    r"developer\.mozilla\.org",
    r"(^|\.)kernel\.org",
    r"research\.google",
    r"(^|\.)openai\.com",
    r"(^|\.)anthropic\.com",
    r"ai\.meta\.com",
    r"(^|\.)microsoft\.com",
    r"pytorch\.org",
    r"tensorflow\.org",
    r"kubernetes\.io",
    r"(^|\.)nih\.gov",
    r"(^|\.)who\.int",
    r"\.edu(\.|/|$)",
]

_TIER2_PATTERNS = [
    r"ieee\.org",
    r"ieeexplore\.ieee\.org",
    r"(^|\.)acm\.org",
    r"dl\.acm\.org",
    r"link\.springer\.com",
    r"sciencedirect\.com",
    r"nature\.com",
    r"(^|\.)mit\.edu",
    r"martinfowler\.com",
    r"geeksforgeeks\.org",
    r"towardsdatascience\.com",
    r"huggingface\.co",
]


def classify_source_tier(url: str) -> str:
    """Classify a URL into credibility tier: tier1, tier2, or tier3."""
    if not url:
        return "tier3"

    try:
        host = (urllib.parse.urlparse(url).netloc or url).lower()
    except Exception:
        host = url.lower()

    for pattern in _TIER1_PATTERNS:
        if re.search(pattern, host):
            return "tier1"

    for pattern in _TIER2_PATTERNS:
        if re.search(pattern, host):
            return "tier2"

    return "tier3"


# ---------------------------------------------------------------------------
# Live Web Search (DuckDuckGo & Tavily)
# ---------------------------------------------------------------------------

def _search_ddg_html(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Search DuckDuckGo HTML endpoint without external dependencies."""
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        logger.warning(f"DuckDuckGo search error: {exc}")
        return []

    results: List[Dict[str, str]] = []
    link_matches = re.findall(
        r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
        html,
        re.DOTALL,
    )
    snippet_matches = re.findall(
        r'<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>',
        html,
        re.DOTALL,
    )

    for i, (raw_link, raw_title) in enumerate(link_matches[:max_results * 2]):
        title = re.sub(r"<[^>]+>", "", raw_title).strip()
        link = raw_link
        if "uddg=" in link:
            try:
                parsed = urllib.parse.urlparse(link)
                qs = urllib.parse.parse_qs(parsed.query)
                if "uddg" in qs:
                    link = qs["uddg"][0]
            except Exception:
                pass

        snippet = ""
        if i < len(snippet_matches):
            snippet = re.sub(r"<[^>]+>", "", snippet_matches[i]).strip()

        if link and not link.startswith("https://duckduckgo.com/"):
            results.append({
                "title": title or link,
                "url": link,
                "snippet": snippet,
                "source_type": classify_source_tier(link),
            })
            if len(results) >= max_results:
                break

    return results


def _search_tavily(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Search via Tavily API if TAVILY_API_KEY is configured."""
    if not config.TAVILY_API_KEY:
        return []
    try:
        data = json.dumps({"query": query, "max_results": max_results, "search_depth": "advanced"}).encode("utf-8")
        req = urllib.request.Request(
            "https://api.tavily.com/search",
            data=data,
            headers={
                "Content-Type": "application/json",
                "api-key": config.TAVILY_API_KEY,
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            results = []
            for r in res_json.get("results", []):
                url = r.get("url", "")
                results.append({
                    "title": r.get("title", url),
                    "url": url,
                    "snippet": r.get("content", ""),
                    "source_type": classify_source_tier(url),
                })
            return results
    except Exception as exc:
        logger.warning(f"Tavily search error: {exc}")
        return []


def perform_web_search(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Perform live web search across available engines.
    Returns ranked citations with title, url, snippet, and source_type.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    # 1. Try Tavily if configured
    results = _search_tavily(clean_query, max_results=max_results)
    if results:
        return dedupe_and_rank(results)

    # 2. Try ddgs / duckduckgo_search Python package if installed
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                from ddgs import DDGS  # type: ignore
            except ImportError:
                from duckduckgo_search import DDGS  # type: ignore

            with DDGS() as ddgs:
                raw = list(ddgs.text(clean_query, max_results=max_results))
                results = [
                    {
                        "title": item.get("title") or item.get("href"),
                        "url": item.get("href"),
                        "snippet": item.get("body", ""),
                        "source_type": classify_source_tier(item.get("href", "")),
                    }
                    for item in raw
                    if item.get("href")
                ]
                if results:
                    return dedupe_and_rank(results)
    except Exception:
        pass

    # 3. Direct lightweight DuckDuckGo HTML search (zero dependencies required)
    results = _search_ddg_html(clean_query, max_results=max_results)
    return dedupe_and_rank(results)


def format_search_results_for_prompt(results: List[Dict[str, str]]) -> str:
    """Format search results into a clean context block for prompt grounding."""
    if not results:
        return ""
    lines = ["--- LIVE WEB SEARCH EVIDENCE (GROUND TRUTH SOURCES) ---"]
    for i, r in enumerate(results, 1):
        tier = r.get("source_type", "tier3").upper()
        title = r.get("title", "Untitled")
        url = r.get("url", "No URL")
        snippet = r.get("snippet", "")
        lines.append(f"[{i}] [{tier}] {title}")
        lines.append(f"    URL: {url}")
        if snippet:
            lines.append(f"    Snippet: {snippet}")
    lines.append("-------------------------------------------------------")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Citation extraction for OpenAI Responses API
# ---------------------------------------------------------------------------

def extract_citations(response: Any) -> List[Dict[str, str]]:
    """Extract citation annotations from OpenAI Responses API output."""
    citations: List[Dict[str, str]] = []
    seen_urls = set()

    output_items = getattr(response, "output", None) or []
    for item in output_items:
        content_blocks = getattr(item, "content", None) or []
        for block in content_blocks:
            annotations = getattr(block, "annotations", None) or []
            for ann in annotations:
                ann_type = getattr(ann, "type", None)
                if ann_type not in ("url_citation", "url"):
                    continue

                url = getattr(ann, "url", None)
                title = getattr(ann, "title", None)

                if not url or url in seen_urls:
                    continue

                seen_urls.add(url)
                citations.append({
                    "title": title or url,
                    "url": url,
                    "source_type": classify_source_tier(url),
                })

    return citations


# ---------------------------------------------------------------------------
# Ranking & Deduplication
# ---------------------------------------------------------------------------

def dedupe_and_rank(citations: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Deduplicate citations by URL and sort by credibility tier."""
    seen = set()
    unique = []

    for citation in citations:
        url = citation.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        if "source_type" not in citation:
            citation["source_type"] = classify_source_tier(url)
        unique.append(citation)

    def sort_key(citation: Dict[str, str]):
        tier = citation.get("source_type") or classify_source_tier(citation.get("url", ""))
        order = {"tier1": 0, "tier2": 1, "tier3": 2}
        return order.get(tier, 3)

    return sorted(unique, key=sort_key)