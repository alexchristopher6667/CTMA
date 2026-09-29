(() => {
  "use strict";

  const AGENT_IDS = ["research", "analyst", "critic"];

  const el = {
    taskInput: document.getElementById("taskInput"),
    confThresholdSlider: document.getElementById("confThresholdSlider"),
    thresholdVal: document.getElementById("thresholdVal"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    taskError: document.getElementById("taskError"),
    teamStatusDot: document.getElementById("teamStatusDot"),
    teamStatusLabel: document.getElementById("teamStatusLabel"),
    providerBadge: document.getElementById("providerBadge"),
    configWarning: document.getElementById("configWarning"),
    workspace: document.getElementById("workspace"),
    linkSvg: document.getElementById("linkSvg"),
    travelDot: document.getElementById("travelDot"),
    overheadPanel: document.getElementById("overheadPanel"),
    overheadReductionVal: document.getElementById("overheadReductionVal"),
    overheadMessagesVal: document.getElementById("overheadMessagesVal"),
    overheadTokensVal: document.getElementById("overheadTokensVal"),
    uncertThresholdVal: document.getElementById("uncertThresholdVal"),
    decisionFeed: document.getElementById("decisionFeed"),
    decisionEmpty: document.getElementById("decisionEmpty"),
    stream: document.getElementById("stream"),
    streamEmpty: document.getElementById("streamEmpty"),
    streamCounter: document.getElementById("streamCounter"),
    evidencePanel: document.getElementById("evidencePanel"),
    evidenceGrid: document.getElementById("evidenceGrid"),
    evidenceEmpty: document.getElementById("evidenceEmpty"),
    evidenceCount: document.getElementById("evidenceCount"),
    collectivePanel: document.getElementById("collectivePanel"),
    collectiveText: document.getElementById("collectiveText"),
    copySynthesisBtn: document.getElementById("copySynthesisBtn"),
    roundSteps: Array.from(document.querySelectorAll(".round-step")),
  };

  const cards = {};
  AGENT_IDS.forEach((id) => {
    cards[id] = {
      root: document.getElementById(`card-${id}`),
      status: document.querySelector(`#card-${id} .agent-status`),
      thought: document.querySelector(`#card-${id} .agent-thought`),
      conf: document.getElementById(`conf-${id}`),
    };
  });

  const STATUS_LABELS = {
    idle: "Idle",
    thinking: "Thinking…",
    reading: "Reading message…",
    reviewing: "Reviewing…",
    speaking: "Speaking…",
    challenging: "Challenging…",
    refining: "Refining…",
    waiting: "Waiting…",
    confident: "Confident (Bypassed)",
    completed: "Completed",
    error: "Error",
  };

  const lineEls = {};
  let messageCount = 0;
  let evidenceSeen = new Set();
  let ws = null;

  // ---------------------------------------------------------------------
  // Geometry: Draw connection lines between agent cards
  // ---------------------------------------------------------------------

  function centerOf(agentId) {
    const wsRect = el.workspace.getBoundingClientRect();
    const cardRect = cards[agentId].root.getBoundingClientRect();
    return {
      x: cardRect.left + cardRect.width / 2 - wsRect.left,
      y: cardRect.top + cardRect.height / 2 - wsRect.top,
    };
  }

  function edgeKey(a, b) {
    return [a, b].sort().join("|");
  }

  function drawLines() {
    if (window.innerWidth <= 820) return;
    const wsRect = el.workspace.getBoundingClientRect();
    el.linkSvg.setAttribute("viewBox", `0 0 ${wsRect.width} ${wsRect.height}`);
    el.linkSvg.innerHTML = "";
    Object.keys(lineEls).forEach((k) => delete lineEls[k]);

    const pairs = [
      ["research", "analyst"],
      ["research", "critic"],
      ["analyst", "critic"],
    ];
    pairs.forEach(([a, b]) => {
      const p1 = centerOf(a);
      const p2 = centerOf(b);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      el.linkSvg.appendChild(line);
      lineEls[edgeKey(a, b)] = line;
    });
  }

  window.addEventListener("resize", drawLines);

  // ---------------------------------------------------------------------
  // Text formatting: Safe Markdown & Clickable URLs
  // ---------------------------------------------------------------------

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------------------------------------------------------------------
  // Mathematical Expression & LaTeX Renderer (KaTeX + Unicode Fallback)
  // ---------------------------------------------------------------------

  function renderMathExpression(expr, isDisplay) {
    const trimmed = (expr || "").trim();
    if (!trimmed) return "";

    // 1. Try KaTeX if available
    if (typeof window.katex !== "undefined" && typeof window.katex.renderToString === "function") {
      try {
        return window.katex.renderToString(trimmed, {
          displayMode: isDisplay,
          throwOnError: false,
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }

    // 2. Unicode Math Formatter Fallback
    let out = trimmed;

    // Greek letters
    const greek = {
      "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\epsilon": "ε",
      "\\zeta": "ζ", "\\eta": "η", "\\theta": "θ", "\\iota": "ι", "\\kappa": "κ",
      "\\lambda": "λ", "\\mu": "μ", "\\nu": "ν", "\\xi": "ξ", "\\pi": "π",
      "\\rho": "ρ", "\\sigma": "σ", "\\tau": "τ", "\\upsilon": "υ", "\\phi": "φ",
      "\\chi": "χ", "\\psi": "ψ", "\\omega": "ω",
      "\\Gamma": "Γ", "\\Delta": "Δ", "\\Theta": "Θ", "\\Lambda": "Λ", "\\Xi": "Ξ",
      "\\Pi": "Π", "\\Sigma": "Σ", "\\Phi": "Φ", "\\Psi": "Ψ", "\\Omega": "Ω",
    };
    Object.keys(greek).forEach((k) => {
      out = out.split(k).join(greek[k]);
    });

    // Mathematical operators & relations
    const ops = {
      "\\ge": "≥", "\\geq": "≥", ">=": "≥",
      "\\le": "≤", "\\leq": "≤", "<=": "≤",
      "\\neq": "≠", "!=": "≠",
      "\\approx": "≈", "\\equiv": "≡",
      "\\times": "×", "\\cdot": "·", "\\pm": "±",
      "\\to": "→", "\\rightarrow": "→", "\\Rightarrow": "⇒",
      "\\in": "∈", "\\notin": "∉",
      "\\infty": "∞",
      "\\sum": "∑", "\\prod": "∏", "\\int": "∫", "\\partial": "∂",
    };
    Object.keys(ops).forEach((k) => {
      out = out.split(k).join(ops[k]);
    });

    // Fractions: \frac{num}{den}
    out = out.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');

    // Subscripts: x_i or x_{conf}
    out = out.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
    out = out.replace(/_([a-zA-Z0-9]+)/g, "<sub>$1</sub>");

    // Superscripts: x^2 or x^{2}
    out = out.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
    out = out.replace(/\^([a-zA-Z0-9]+)/g, "<sup>$1</sup>");

    // Text formatting in math: \text{...}
    out = out.replace(/\\text\s*\{([^{}]+)\}/g, "$1");

    return isDisplay
      ? `<div class="math-block">${out}</div>`
      : `<span class="math-inline">${out}</span>`;
  }

  // ---------------------------------------------------------------------
  // Heading & Section Normalizer
  // ---------------------------------------------------------------------

  function normalizeHeadings(rawText) {
    if (!rawText) return "";
    const lines = rawText.split("\n");
    const sectionPattern = /^(\s*)(Answer|Key\s*points?|Key\s*findings?|Key\s*take[\-\s]*aways?|Executive\s*summary|Summary|Remaining\s*uncertainties|Unresolved\s*questions?|Architectural\s*trade[\-\s]*offs?|Trade[\-\s]*offs?|Technical\s*analysis|Analysis|Methodology|Recommendations?|Conclusion|Sources?)\s*:?\s*$/i;

    const processed = lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Already a markdown heading: # Heading
      if (/^#{1,6}\s+/.test(trimmed)) {
        return line;
      }

      // Standalone section title on its own line
      const match = trimmed.match(sectionPattern);
      if (match) {
        const title = match[2].trim();
        const cleanTitle = title.replace(/\b\w/g, (c) => c.toUpperCase());
        return `### ${cleanTitle}`;
      }

      // Numbered section header: "1. Proven Components" or "2. Architectural Trade-offs"
      const numberedHeaderMatch = trimmed.match(/^(\d+\.)\s+([A-Z][A-Za-z0-9\s—–\/\-]{2,50})$/);
      if (numberedHeaderMatch) {
        return `### ${numberedHeaderMatch[1]} ${numberedHeaderMatch[2].trim()}`;
      }

      // Short standalone title ending with colon: e.g. "Key Observations:"
      const shortColonMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s—–\/\-]{2,40}):\s*$/);
      if (shortColonMatch && !shortColonMatch[1].includes("http")) {
        return `### ${shortColonMatch[1].trim()}`;
      }

      // Bold-wrapped line functioning as a heading: **Key Points:**
      const boldHeadingMatch = trimmed.match(/^\*\*([A-Za-z0-9\s—–\/\-]+?):?\*\*\s*$/);
      if (boldHeadingMatch && boldHeadingMatch[1].length < 45) {
        return `### ${boldHeadingMatch[1].trim()}`;
      }

      // First line of document if it acts as a main title: e.g. "Mathematical Confidence Model for Adaptive Gating"
      if (idx === 0 && trimmed.length < 75 && !/[.!?]$/.test(trimmed) && /^[A-Z]/.test(trimmed)) {
        return `### ${trimmed}`;
      }

      return line;
    });

    return processed.join("\n");
  }

  // ---------------------------------------------------------------------
  // Fallback Markdown Table Parser (if Marked is not loaded or for custom safety)
  // ---------------------------------------------------------------------

  function parseMarkdownTables(text) {
    const tableRegex = /((?:^[ \t]*\|.+\|[ \t]*\n?)+)/gm;
    return text.replace(tableRegex, (match) => {
      const rows = match.trim().split("\n").map(r => r.trim()).filter(Boolean);
      if (rows.length < 2) return match;

      let html = '<div class="table-wrap"><table>';
      let inBody = false;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Check if delimiter row: |---|---|
        if (/^[ \t]*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(row)) {
          if (!inBody) {
            html += '</thead><tbody>';
            inBody = true;
          }
          continue;
        }

        const cells = row.split("|").slice(1, -1).map(c => c.trim());
        if (i === 0 && !inBody) {
          html += '<thead><tr>';
          cells.forEach(c => { html += `<th>${c}</th>`; });
          html += '</tr>';
        } else {
          if (!inBody) {
            html += '<tbody>';
            inBody = true;
          }
          html += '<tr>';
          cells.forEach(c => { html += `<td>${c}</td>`; });
          html += '</tr>';
        }
      }

      if (inBody) {
        html += '</tbody>';
      }
      html += '</table></div>';
      return html;
    });
  }

  // ---------------------------------------------------------------------
  // Master Text, Markdown, Table & Math Formatter
  // ---------------------------------------------------------------------

  function formatContent(raw) {
    if (!raw) return "";

    let text = String(raw);

    // Pre-processing: normalize LaTeX bracket/parenthesis quirks and LLM artifacts
    text = text.replace(/\\bigl\(/g, "(").replace(/\\bigr\)/g, ")");
    text = text.replace(/\\Bigl\(/g, "(").replace(/\\Bigr\)/g, ")");
    text = text.replace(/\\\[([\s\S]+?)\\\]/g, "\n\n$$$$$1$$$$\n\n");
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$");

    // Clean blockquote angle brackets before math: "> $$" -> "$$"
    text = text.replace(/^[ \t]*>[ \t]*(\$\$|\\\[|\[)/gm, "$1");

    // Clean semicolon spacers inside math notation: ";=;" -> "=", ";+;" -> "+"
    text = text.replace(/;\s*([=+\-*\/<>]|\\ge|\\le)\s*;/g, " $1 ");
    text = text.replace(/;\s*\\/g, " \\");

    // Normalize bracketed display equations: [ C_i = \alpha ... ] -> $$ C_i = \alpha ... $$
    text = text.replace(/^[ \t]*\[\s*([\s\S]*?(?:\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega|Delta|Theta|Sigma|ge|geq|le|leq|neq|approx|times|sum|int|infty|frac|text|sqrt)|[A-Za-z0-9]_[A-Za-z0-9\{])[^\]\n]*?)\s*\][ \t]*$/gm, (m, math) => {
      let cleanMath = math.replace(/\s+\.\s*$/, "").replace(/^[><\s]+|[><\s]+$/g, "").trim();
      return `\n\n$$${cleanMath}$$\n\n`;
    });

    // Normalize parenthesized LaTeX math: e.g. (\theta_{\text{conf}}) or (C_i)
    text = text.replace(/\(\s*(\\theta[A-Za-z0-9_\{\}\\\s]*|\\alpha|\\beta|\\gamma|\\Delta|\\tau|\\sigma|C_i)\s*\)/g, (m, math) => {
      return `$${math.trim()}$`;
    });

    // Step 1: Normalize headings (e.g. "Key points" -> "### Key Points")
    text = normalizeHeadings(text);

    // Step 2: Extract Mathematical Expressions & Replace with placeholders
    const mathTokens = [];

    // Block math: $$ ... $$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, expr) => {
      const idx = mathTokens.length;
      let cleanExpr = expr.replace(/^[><\s]+|[><\s]+$/g, "").trim();
      mathTokens.push(renderMathExpression(cleanExpr, true));
      return `%%CTMARS_MATH_BLOCK_${idx}%%`;
    });

    // Inline math: $ ... $ (must not match empty $ or currency like $50)
    text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (m, prefix, expr) => {
      if (/^\s*\d+[\d,.]*\s*$/.test(expr)) return m;
      const idx = mathTokens.length;
      mathTokens.push(renderMathExpression(expr, false));
      return `${prefix}%%CTMARS_MATH_INLINE_${idx}%%`;
    });

    // Step 3: Typography & Special Characters
    // Em-dash and En-dash
    text = text.replace(/(\s)---(\s)/g, "$1—$2").replace(/(\s)--(\s)/g, "$1–$2");
    // Arrows
    text = text.replace(/(\s)->(\s)/g, "$1→$2").replace(/(\s)=>(\s)/g, "$1⇒$2");

    // Step 4: Parse Markdown (Marked.js with Table support or Fallback)
    let parsedHtml = "";
    if (typeof window.marked !== "undefined" && typeof window.marked.parse === "function") {
      try {
        parsedHtml = window.marked.parse(text, {
          gfm: true,
          breaks: false,
        });
      } catch (err) {
        console.warn("Marked.js error:", err);
      }
    }

    if (!parsedHtml) {
      // Fallback parser if marked is unavailable
      let safe = escapeHtml(text);
      safe = parseMarkdownTables(safe);
      safe = safe.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      safe = safe.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      safe = safe.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      safe = safe.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      safe = safe.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
      safe = safe.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
      safe = safe.replace(/\n\n+/g, "</p><p>");
      safe = `<p>${safe}</p>`;
      parsedHtml = safe;
    }

    // Step 5: Restore Math Tokens
    mathTokens.forEach((tokenHtml, idx) => {
      parsedHtml = parsedHtml.split(`%%CTMARS_MATH_BLOCK_${idx}%%`).join(tokenHtml);
      parsedHtml = parsedHtml.split(`%%CTMARS_MATH_INLINE_${idx}%%`).join(tokenHtml);
    });

    // Step 5b: Clean any residual bare LaTeX commands in regular text
    parsedHtml = parsedHtml
      .replace(/\\theta(?:_\{([^{}]+)\}|_([a-zA-Z0-9]+))?/g, (m, sub1, sub2) => {
        const s = sub1 || sub2;
        return s ? `θ<sub>${s}</sub>` : `θ`;
      })
      .replace(/\\alpha/g, "α")
      .replace(/\\beta/g, "β")
      .replace(/\\gamma/g, "γ")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\tau/g, "τ")
      .replace(/\\sigma/g, "σ")
      .replace(/\\mu/g, "μ")
      .replace(/\\ge(?:q)?\b/g, "≥")
      .replace(/\\le(?:q)?\b/g, "≤")
      .replace(/\\approx/g, "≈")
      .replace(/\\neq/g, "≠")
      .replace(/\\times/g, "×")
      .replace(/\\pm/g, "±")
      .replace(/\\cdot/g, "·")
      .replace(/\\to\b/g, "→")
      .replace(/\\infty/g, "∞")
      .replace(/\\text\{([^{}]+)\}/g, "$1");

    // Step 6: Ensure all links open in a new tab safely
    parsedHtml = parsedHtml.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

    // Wrap tables in responsive container if not already wrapped
    parsedHtml = parsedHtml.replace(/(?<!<div class="table-wrap">)(<table[\s\S]*?<\/table>)/gi, (match) => {
      return `<div class="table-wrap">${match}</div>`;
    });

    return parsedHtml;
  }

  function formatErrorMessage(rawMsg) {
    if (!rawMsg) return "An unexpected error occurred.";
    let msg = String(rawMsg);
    const jsonMatch = msg.match(/'message':\s*'([^']+)'/);
    if (jsonMatch) return jsonMatch[1];
    const msgMatch = msg.match(/"message":\s*"([^"]+)"/);
    if (msgMatch) return msgMatch[1];
    if (msg.length > 200) {
      msg = msg.substring(0, 197) + "…";
    }
    return msg;
  }

  // ---------------------------------------------------------------------
  // Agent card & status updates
  // ---------------------------------------------------------------------

  function setAgentStatus(agentId, status) {
    const card = cards[agentId];
    if (!card) return;
    card.status.dataset.status = status;
    card.status.textContent = STATUS_LABELS[status] || status;

    const isActive = ["thinking", "reading", "reviewing", "speaking", "challenging", "refining"].includes(status);
    card.root.classList.toggle("card-active", isActive);
  }

  function setAgentThought(agentId, text) {
    const card = cards[agentId];
    if (!card || !text) return;
    card.thought.textContent = text;
  }

  function setAgentConfidence(agentId, conf) {
    const card = cards[agentId];
    if (!card || !card.conf) return;
    if (typeof conf === "number") {
      const pct = Math.round(conf * 100);
      card.conf.textContent = `${pct}% conf`;
      card.conf.hidden = false;
    } else {
      card.conf.hidden = true;
    }
  }

  function setTeamStatus(active) {
    el.teamStatusDot.classList.toggle("active", active);
    el.teamStatusDot.classList.toggle("idle", !active);
    el.teamStatusLabel.textContent = active ? "Team Active" : "Team Idle";
    el.stopBtn.hidden = !active;
    el.stopBtn.disabled = !active;
  }

  function setRound(roundNumber) {
    el.roundSteps.forEach((step) => {
      const r = Number(step.dataset.round);
      step.classList.toggle("active", r === roundNumber);
      step.classList.toggle("done", r < roundNumber);
    });
  }

  // ---------------------------------------------------------------------
  // Live Stream Messages
  // ---------------------------------------------------------------------

  function agentIdFromName(name) {
    const lower = (name || "").toLowerCase();
    if (lower.startsWith("research")) return "research";
    if (lower.startsWith("analyst")) return "analyst";
    if (lower.startsWith("critic")) return "critic";
    return "";
  }

  function appendStreamMessage(sender, receiver, content, confidence) {
    if (el.streamEmpty && el.streamEmpty.parentNode) {
      el.streamEmpty.remove();
    }
    const fromId = agentIdFromName(sender);
    const wrap = document.createElement("div");
    wrap.className = `stream-msg${fromId ? ` from-${fromId}` : ""}`;

    const head = document.createElement("div");
    head.className = "stream-msg-head";

    const dot = document.createElement("span");
    dot.className = "dot";
    head.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = receiver && receiver !== "Team" ? `${sender} → ${receiver}` : `${sender}`;
    head.appendChild(label);

    if (typeof confidence === "number") {
      const badge = document.createElement("span");
      badge.className = "stream-conf-badge";
      badge.textContent = `${Math.round(confidence * 100)}% conf`;
      head.appendChild(badge);
    }

    wrap.appendChild(head);

    const body = document.createElement("div");
    body.className = "stream-msg-body";
    body.innerHTML = formatContent(content);
    wrap.appendChild(body);

    el.stream.appendChild(wrap);
    el.stream.scrollTop = el.stream.scrollHeight;

    messageCount += 1;
    el.streamCounter.textContent = `${messageCount} message${messageCount === 1 ? "" : "s"}`;
  }

  // ---------------------------------------------------------------------
  // Grounding & Evidence Cards
  // ---------------------------------------------------------------------

  function addEvidenceItems(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    if (el.evidenceEmpty && el.evidenceEmpty.parentNode) {
      el.evidenceEmpty.remove();
    }

    items.forEach((item) => {
      const url = item.source_url || "";
      const claim = item.claim || "";
      const key = `${url}|${claim}`;
      if (evidenceSeen.has(key)) return;
      evidenceSeen.add(key);

      const card = document.createElement("div");
      card.className = "evidence-card";

      const top = document.createElement("div");
      top.className = "evidence-top";

      const tierTag = document.createElement("span");
      const tier = (item.source_type || "tier3").toLowerCase();
      tierTag.className = `tier-tag ${tier}`;
      const tierLabels = {
        tier1: "Tier 1: Official / Standard",
        tier2: "Tier 2: Academic / Journal",
        tier3: "Tier 3: Web Source",
      };
      tierTag.textContent = tierLabels[tier] || "Web Citation";
      top.appendChild(tierTag);

      if (typeof item.confidence === "number") {
        const confSpan = document.createElement("span");
        confSpan.className = "conf-pill";
        confSpan.textContent = `${Math.round(item.confidence * 100)}% conf`;
        top.appendChild(confSpan);
      }
      card.appendChild(top);

      if (item.source_title || url) {
        const titleEl = document.createElement("a");
        titleEl.className = "evidence-card-title";
        titleEl.textContent = item.source_title || url;
        if (url) {
          titleEl.href = url;
          titleEl.target = "_blank";
          titleEl.rel = "noopener noreferrer";
        }
        card.appendChild(titleEl);
      }

      if (item.claim) {
        const claimP = document.createElement("p");
        claimP.className = "evidence-claim";
        claimP.innerHTML = `<strong>Claim:</strong> ${escapeHtml(item.claim)}`;
        card.appendChild(claimP);
      }

      if (item.evidence) {
        const snipP = document.createElement("p");
        snipP.className = "evidence-snippet";
        snipP.textContent = `"${item.evidence}"`;
        card.appendChild(snipP);
      }

      el.evidenceGrid.appendChild(card);
    });

    const count = evidenceSeen.size;
    el.evidenceCount.textContent = `${count} source${count === 1 ? "" : "s"}`;
  }

  // ---------------------------------------------------------------------
  // Message Travel Animation
  // ---------------------------------------------------------------------

  const AGENT_COLOR_VAR = {
    research: "var(--research)",
    analyst: "var(--analyst)",
    critic: "var(--critic)",
  };

  function animateTravel(senderId, receiverId) {
    if (window.innerWidth <= 820) return;
    const dot = el.travelDot;
    const from = centerOf(senderId);
    const to = centerOf(receiverId);

    dot.style.color = AGENT_COLOR_VAR[senderId] || "#fff";
    dot.style.background = AGENT_COLOR_VAR[senderId] || "#fff";
    dot.style.transition = "none";
    dot.style.left = `${from.x}px`;
    dot.style.top = `${from.y}px`;
    dot.style.opacity = "1";
    dot.hidden = false;

    // eslint-disable-next-line no-unused-expressions
    dot.offsetHeight;

    dot.style.transition = "left 0.5s cubic-bezier(.4,.1,.2,1), top 0.5s cubic-bezier(.4,.1,.2,1), opacity 0.2s ease";
    dot.style.left = `${to.x}px`;
    dot.style.top = `${to.y}px`;

    window.setTimeout(() => {
      dot.style.opacity = "0";
    }, 520);

    const key = edgeKey(senderId, receiverId);
    const line = lineEls[key];
    if (line) {
      line.classList.add("active");
      line.style.stroke = AGENT_COLOR_VAR[senderId] || "";
      window.setTimeout(() => {
        line.classList.remove("active");
        line.style.stroke = "";
      }, 1400);
    }
  }

  // ---------------------------------------------------------------------
  // Collective Reasoning & Copy Action
  // ---------------------------------------------------------------------

  function showCollective(text) {
    el.collectiveText.innerHTML = formatContent(text);
    el.collectivePanel.hidden = false;
    el.collectivePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  el.copySynthesisBtn.addEventListener("click", async () => {
    const rawText = el.collectiveText.innerText || el.collectiveText.textContent;
    try {
      await navigator.clipboard.writeText(rawText);
      el.copySynthesisBtn.classList.add("copied");
      el.copySynthesisBtn.innerHTML = "<span>✓</span> Copied!";
      setTimeout(() => {
        el.copySynthesisBtn.classList.remove("copied");
        el.copySynthesisBtn.innerHTML = '<span>📋</span> Copy Answer';
      }, 2000);
    } catch (err) {
      console.warn("Clipboard copy error:", err);
    }
  });

  // ---------------------------------------------------------------------
  // WebSocket Connection & Event Handler
  // ---------------------------------------------------------------------

  function connectSocket() {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${window.location.host}/ws`);

    ws.addEventListener("message", (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch (err) {
        return;
      }
      handleEvent(data);
    });

    ws.addEventListener("close", () => {
      window.setTimeout(connectSocket, 1500);
    });
  }

  function handleEvent(evt) {
    switch (evt.type) {
      case "discussion_started": {
        setTeamStatus(true);
        el.collectivePanel.hidden = true;
        AGENT_IDS.forEach((id) => {
          setAgentStatus(id, "idle");
          setAgentThought(id, "Investigating task…");
          setAgentConfidence(id, null);
        });
        if (evt.provider && evt.model) {
          updateProviderBadge(evt.provider, evt.model);
        }
        break;
      }
      case "round_started": {
        setRound(evt.round);
        break;
      }
      case "round_finished": {
        break;
      }
      case "agent_status": {
        setAgentStatus(evt.agent, evt.status);
        break;
      }
      case "agent_thinking": {
        setAgentStatus(evt.agent, "thinking");
        break;
      }
      case "agent_finished": {
        setAgentStatus(evt.agent, "speaking");
        setAgentThought(evt.agent, evt.reasoning);
        if (typeof evt.confidence === "number") {
          setAgentConfidence(evt.agent, evt.confidence);
        }
        if (evt.evidence) {
          addEvidenceItems(evt.evidence);
        }
        break;
      }
      case "agent_refining": {
        setAgentStatus(evt.agent, "refining");
        break;
      }
      case "agent_error": {
        setAgentStatus(evt.agent, "error");
        setAgentThought(evt.agent, `Issue: ${formatErrorMessage(evt.message)}`);
        break;
      }
      case "message_sent": {
        const msg = evt.message;
        appendStreamMessage(msg.sender, msg.receiver, msg.content, msg.confidence);
        if (evt.sender_id && evt.receiver_id) {
          animateTravel(evt.sender_id, evt.receiver_id);
        }
        break;
      }
      case "message_received": {
        if (evt.receiver_id) setAgentStatus(evt.receiver_id, "reading");
        break;
      }
      case "evidence_discovered": {
        if (evt.evidence) {
          addEvidenceItems(evt.evidence);
        }
        break;
      }
      case "communication_decision": {
        if (el.decisionEmpty && el.decisionEmpty.parentNode) {
          el.decisionEmpty.remove();
        }
        const card = document.createElement("div");
        card.className = `decision-card ${evt.decision}`;

        const badge = document.createElement("span");
        badge.className = "decision-badge";
        badge.textContent = evt.decision === "bypass" ? "Bypassed" : "Approached";
        card.appendChild(badge);

        const text = document.createElement("span");
        text.textContent = evt.reason;
        card.appendChild(text);

        el.decisionFeed.appendChild(card);
        el.decisionFeed.scrollTop = el.decisionFeed.scrollHeight;

        if (typeof evt.sent_count === "number" && typeof evt.bypassed_count === "number") {
          el.overheadMessagesVal.textContent = `${evt.sent_count} sent / ${evt.bypassed_count} avoided`;
          const total = Math.max(1, evt.sent_count + evt.bypassed_count);
          const redPct = Math.round((evt.bypassed_count / total) * 100);
          el.overheadReductionVal.textContent = `${redPct}%`;
        }
        if (typeof evt.tokens_saved === "number") {
          el.overheadTokensVal.textContent = `~${evt.tokens_saved} tokens`;
        }

        if (evt.decision === "bypass") {
          setAgentStatus(evt.sender_id, "confident");
          setAgentThought(
            evt.sender_id,
            `High confidence (${Math.round(evt.confidence * 100)}% ≥ ${Math.round(evt.threshold * 100)}%). Cross-talk consultation bypassed to eliminate token overhead.`
          );
        } else {
          setAgentThought(
            evt.sender_id,
            `Uncertainty high (${Math.round(evt.uncertainty * 100)}%). Approaching ${evt.receiver_name} to verify.`
          );
        }
        break;
      }
      case "discussion_finished": {
        setTeamStatus(false);
        setRound(4);
        AGENT_IDS.forEach((id) => setAgentStatus(id, "completed"));
        if (evt.evidence) {
          addEvidenceItems(evt.evidence);
        }
        if (evt.stats) {
          el.overheadReductionVal.textContent = `${evt.stats.overhead_reduction_pct}%`;
          el.overheadMessagesVal.textContent = `${evt.stats.messages_sent} sent / ${evt.stats.messages_bypassed} avoided`;
          el.overheadTokensVal.textContent = `~${evt.stats.tokens_saved} tokens`;
        }
        showCollective(evt.collective_reasoning);
        el.startBtn.disabled = false;
        break;
      }
      case "discussion_cancelled": {
        setTeamStatus(false);
        el.taskError.textContent = "Discussion stopped by user.";
        el.startBtn.disabled = false;
        AGENT_IDS.forEach((id) => setAgentStatus(id, "idle"));
        break;
      }
      case "discussion_error": {
        setTeamStatus(false);
        el.taskError.textContent = `Error: ${formatErrorMessage(evt.message)}`;
        el.startBtn.disabled = false;
        break;
      }
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------
  // Pre-flight Status & Provider Badge
  // ---------------------------------------------------------------------

  function updateProviderBadge(provider, model) {
    if (!provider || provider === "none") {
      el.providerBadge.textContent = "No API Key";
      el.providerBadge.className = "provider-pill";
      el.configWarning.hidden = false;
      return;
    }
    el.configWarning.hidden = true;
    const provName = provider === "groq" ? "Groq" : "OpenAI";
    el.providerBadge.textContent = `${provName}: ${model || ""}`;
    el.providerBadge.className = `provider-pill ${provider}`;
  }

  async function checkServerStatus() {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      updateProviderBadge(data.provider, data.model);
      if (data.running) {
        setTeamStatus(true);
        el.startBtn.disabled = true;
      }
    } catch (err) {
      console.warn("Could not query server status:", err);
    }
  }

  // ---------------------------------------------------------------------
  // Discussion Controls (Start & Stop)
  // ---------------------------------------------------------------------

  function resetDiscussionUI() {
    el.stream.innerHTML = "";
    const streamEmpty = document.createElement("p");
    streamEmpty.className = "stream-empty";
    streamEmpty.id = "streamEmpty";
    streamEmpty.textContent = "Messages exchanged between agents will stream here in real time.";
    el.stream.appendChild(streamEmpty);
    el.streamEmpty = streamEmpty;

    el.evidenceGrid.innerHTML = "";
    const evEmpty = document.createElement("p");
    evEmpty.className = "evidence-empty";
    evEmpty.id = "evidenceEmpty";
    evEmpty.textContent = "Real-world citations, academic papers, and evidence tiers will appear here as agents investigate.";
    el.evidenceGrid.appendChild(evEmpty);
    el.evidenceEmpty = evEmpty;

    if (el.decisionFeed) {
      el.decisionFeed.innerHTML = "";
      const decEmpty = document.createElement("div");
      decEmpty.className = "decision-empty";
      decEmpty.id = "decisionEmpty";
      decEmpty.textContent = "Live gating decisions (Peer Approach vs. Silent Bypass) will stream here during debate.";
      el.decisionFeed.appendChild(decEmpty);
      el.decisionEmpty = decEmpty;
    }
    if (el.overheadReductionVal) el.overheadReductionVal.textContent = "0%";
    if (el.overheadMessagesVal) el.overheadMessagesVal.textContent = "0 sent / 0 avoided";
    if (el.overheadTokensVal) el.overheadTokensVal.textContent = "0 tokens";

    messageCount = 0;
    evidenceSeen.clear();
    el.streamCounter.textContent = "0 messages";
    el.evidenceCount.textContent = "0 sources";
    el.collectivePanel.hidden = true;
    setRound(0);
  }

  async function startDiscussion() {
    const task = el.taskInput.value.trim();
    el.taskError.textContent = "";

    if (!task) {
      el.taskError.textContent = "Please enter a technical question for the team.";
      return;
    }
    if (task.length > 500) {
      el.taskError.textContent = "Please keep your prompt under 500 characters.";
      return;
    }

    const confThresh = parseFloat(el.confThresholdSlider ? el.confThresholdSlider.value : 0.75) || 0.75;

    el.startBtn.disabled = true;
    resetDiscussionUI();

    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, confidence_threshold: confThresh }),
      });
      const data = await res.json();
      if (!res.ok) {
        el.taskError.textContent = data.error || "Could not start the discussion.";
        el.startBtn.disabled = false;
        setTeamStatus(false);
      } else {
        setTeamStatus(true);
      }
    } catch (err) {
      el.taskError.textContent = "Could not reach the server. Is the backend running?";
      el.startBtn.disabled = false;
      setTeamStatus(false);
    }
  }

  async function stopDiscussion() {
    el.stopBtn.disabled = true;
    el.stopBtn.textContent = "Stopping…";
    try {
      await fetch("/api/stop", { method: "POST" });
    } catch (err) {
      console.warn("Stop request failed:", err);
    } finally {
      el.stopBtn.textContent = "Stop Discussion";
    }
  }

  el.startBtn.addEventListener("click", startDiscussion);
  el.stopBtn.addEventListener("click", stopDiscussion);

  el.taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      startDiscussion();
    }
  });

  window.addEventListener("load", () => {
    drawLines();
    connectSocket();
    checkServerStatus();

    if (el.confThresholdSlider) {
      el.confThresholdSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 0.75;
        el.thresholdVal.textContent = `${val.toFixed(2)} (${Math.round(val * 100)}%)`;
        el.uncertThresholdVal.textContent = `${(1.0 - val).toFixed(2)} (${Math.round((1.0 - val) * 100)}%)`;
      });
    }
  });
})();
