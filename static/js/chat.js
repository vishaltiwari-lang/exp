/**
 * STEM Experiment Kit — Multi-Kit Chatbot Frontend
 */

const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const stepList = document.getElementById("stepList");
const headerStep = document.getElementById("headerStep");
const quickActions = document.getElementById("quickActions");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");
const resetBtn = document.getElementById("resetBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const kitSelector = document.getElementById("kitSelector");
const headerKitSelector = document.getElementById("headerKitSelector");
const sidebarTitle = document.getElementById("sidebarTitle");
const sidebarSubtitle = document.getElementById("sidebarSubtitle");
const headerBadge = document.getElementById("headerBadge");

let currentStep = null;
let isLoading = false;
let currentKit = "karaoke";
let totalSteps = 23;
let kitName = "Karaoke Speaker Kit";

// Kit display config
const KIT_ICONS = {
    "karaoke": "🎤",
    "school_kit": "🔬",
};

// ─── Initialize ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    initThemes();
    initLightbox();
    loadKits();
});

// ─── Image Lightbox (tap any picture to see it full-screen) ─────────────────

function initLightbox() {
    const overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.innerHTML = `<button class="lightbox-close" aria-label="Close">✕</button><img alt="">`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove("open");
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    // Delegate clicks from any card / step image
    document.addEventListener("click", (e) => {
        const img = e.target.closest(".card-banner img, .step-image-card img");
        if (!img) return;
        overlay.querySelector("img").src = img.src;
        overlay.querySelector("img").alt = img.alt || "";
        overlay.classList.add("open");
    });
}

// ─── Colour Themes ──────────────────────────────────────────────────────────

const THEMES = [
    { id: "sunshine",  name: "Sunshine",  dot: "linear-gradient(135deg,#ff8a3d,#ff6b6b)" },
    { id: "ocean",     name: "Ocean",     dot: "linear-gradient(135deg,#1f9ecb,#3ac0b0)" },
    { id: "bubblegum", name: "Bubblegum", dot: "linear-gradient(135deg,#e0559f,#b06ae0)" },
    { id: "mint",      name: "Mint",      dot: "linear-gradient(135deg,#2bb673,#4fc3a1)" },
    { id: "midnight",  name: "Midnight",  dot: "linear-gradient(135deg,#7c86ff,#9d7cff)" },
    { id: "classic",   name: "Classic",   dot: "linear-gradient(135deg,#242736,#7c5cfc)" },
];
const DEFAULT_THEME = "sunshine";
const THEME_KEY = "stem_theme";

function applyTheme(id) {
    const theme = THEMES.find((t) => t.id === id) ? id : DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".swatch").forEach((el) => {
        el.classList.toggle("selected", el.dataset.theme === theme);
    });
}

function saveTheme(id) {
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* private mode — ignore */ }
}

function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function initThemes() {
    const btn = document.getElementById("themeBtn");
    const popover = document.getElementById("themePopover");
    const swatches = document.getElementById("themeSwatches");
    const resetBtn = document.getElementById("themeReset");
    if (!btn || !popover || !swatches) return;

    // Build swatches
    swatches.innerHTML = THEMES.map((t) => `
        <button class="swatch" data-theme="${t.id}" title="${t.name} theme">
            <span class="swatch-dot" style="background:${t.dot}"></span>
            <span>${t.name}</span>
        </button>
    `).join("");

    swatches.querySelectorAll(".swatch").forEach((el) => {
        el.addEventListener("click", () => {
            const id = el.dataset.theme;
            applyTheme(id);
            saveTheme(id);
        });
    });

    // Apply saved (or default) theme
    applyTheme(getSavedTheme() || DEFAULT_THEME);

    // Toggle popover
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        popover.hidden = !popover.hidden;
    });
    document.addEventListener("click", (e) => {
        if (!popover.hidden && !popover.contains(e.target) && e.target !== btn) {
            popover.hidden = true;
        }
    });

    // Reset / revert to default look
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            applyTheme(DEFAULT_THEME);
            saveTheme(DEFAULT_THEME);
        });
    }
}

// ─── Kit Loading ────────────────────────────────────────────────

async function loadKits() {
    try {
        const res = await fetch("/api/kits");
        const data = await res.json();
        kitSelector.innerHTML = "";
        headerKitSelector.innerHTML = "";
        data.kits.forEach((kit) => {
            const option = document.createElement("option");
            option.value = kit.kit_id;
            option.textContent = `${KIT_ICONS[kit.kit_id] || "📦"} ${kit.name}`;
            if (kit.kit_id === data.default) option.selected = true;
            kitSelector.appendChild(option);

            // Clone for header selector
            const option2 = option.cloneNode(true);
            headerKitSelector.appendChild(option2);
        });
        currentKit = data.default;
        const defaultKit = data.kits.find(k => k.kit_id === data.default);
        if (defaultKit) {
            kitName = defaultKit.name;
            totalSteps = defaultKit.num_steps;
        }
        kitSelector.addEventListener("change", () => {
            headerKitSelector.value = kitSelector.value;
            onKitChange();
        });
        headerKitSelector.addEventListener("change", () => {
            kitSelector.value = headerKitSelector.value;
            onKitChange();
        });
        await loadStepsSidebar();
        showWelcomeMessage();
    } catch (e) {
        console.error("Failed to load kits:", e);
        await loadStepsSidebar();
        showWelcomeMessage();
    }
}

async function onKitChange() {
    const newKit = kitSelector.value;
    console.log("[onKitChange] selected:", newKit, "current:", currentKit);
    if (newKit === currentKit) return;
    currentKit = newKit;
    currentStep = null;
    chatMessages.innerHTML = "";
    headerStep.innerHTML = "<span>No step selected</span>";
    document.querySelectorAll(".step-item").forEach((el) => el.classList.remove("active"));
    closeSidebar();
    await loadStepsSidebar();
    showWelcomeMessage();
    updateQuickActions();
}

function showWelcomeMessage() {
    const icon = KIT_ICONS[currentKit] || "📦";
    addBotMessage(
        `Welcome to the **${kitName}** Assistant! ${icon}🔊\n\n` +
        "I'll guide you through the experiments — hands-on STEM learning linked to NCERT Science.\n\n" +
        "**I can help you with:**\n" +
        "• Step-by-step experiment instructions with images\n" +
        "• Detailed **sub-steps** for any step\n" +
        "• **Science concepts** (NCERT connections)\n" +
        "• **Safety tips** and required tools\n" +
        "• Troubleshooting help\n\n" +
        "Try the quick buttons below, or ask me anything about the experiments!",
        []
    );
}

// ─── Sidebar Steps ──────────────────────────────────────────────

async function loadStepsSidebar() {
    try {
        const res = await fetch(`/api/steps?kit=${currentKit}`);
        const data = await res.json();
        kitName = data.experiment;
        totalSteps = data.steps.length;
        const icon = KIT_ICONS[currentKit] || "📦";
        sidebarTitle.textContent = `${icon} ${kitName}`;
        sidebarSubtitle.textContent = `${totalSteps}-Step Experiment Guide`;
        headerBadge.textContent = `${kitName} • AI-Powered • NCERT Science`;
        stepList.innerHTML = "";
        data.steps.forEach((step) => {
            const div = document.createElement("div");
            div.className = "step-item";
            div.dataset.step = step.step_number;
            div.innerHTML = `
                <div class="step-number">${step.step_number}</div>
                <div class="step-info">
                    <div class="step-title">${escapeHTML(step.title)}</div>
                    <div class="step-topic">${escapeHTML(step.topic)}</div>
                </div>
            `;
            div.addEventListener("click", () => {
                sendMessage(`Tell me about step ${step.step_number}`);
                closeSidebar();
            });
            stepList.appendChild(div);
        });
    } catch (e) {
        console.error("Failed to load steps:", e);
    }
}

function highlightStep(stepNum) {
    document.querySelectorAll(".step-item").forEach((el) => {
        el.classList.toggle("active", parseInt(el.dataset.step) === stepNum);
    });
    if (stepNum) {
        headerStep.innerHTML = `<span>Step ${stepNum} of ${totalSteps}</span>`;
    }
}

// ─── Mobile Sidebar ─────────────────────────────────────────────

mobileMenu.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("active");
});

sidebarOverlay.addEventListener("click", closeSidebar);

function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
}

// ─── Reset Chat ─────────────────────────────────────────────────

resetBtn.addEventListener("click", resetChat);

function resetChat() {
    currentStep = null;
    chatMessages.innerHTML = "";
    headerStep.innerHTML = "<span>No step selected</span>";
    document.querySelectorAll(".step-item").forEach((el) => el.classList.remove("active"));
    const icon = KIT_ICONS[currentKit] || "📦";
    addBotMessage(
        `Chat has been reset! 🔄\n\n` +
        `Welcome back to the **${kitName}** Assistant! ${icon}🔊\n\n` +
        "Ask me anything about the experiments — steps, science concepts, safety tips, or troubleshooting!",
        []
    );
    updateQuickActions();
}

// ─── Chat ───────────────────────────────────────────────────────

sendBtn.addEventListener("click", () => {
    const msg = userInput.value.trim();
    if (msg && !isLoading) sendMessage(msg);
});

userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const msg = userInput.value.trim();
        if (msg && !isLoading) sendMessage(msg);
    }
});

// Auto-resize textarea
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

// Quick action buttons
quickActions.addEventListener("click", (e) => {
    const btn = e.target.closest(".quick-btn");
    if (btn && !isLoading) {
        sendMessage(btn.dataset.msg);
    }
});

async function sendMessage(text) {
    if (isLoading) return;
    isLoading = true;
    sendBtn.disabled = true;

    addUserMessage(text);
    userInput.value = "";
    userInput.style.height = "auto";

    const typingEl = addTypingIndicator();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                current_step: currentStep,
                kit_id: currentKit,
            }),
        });

        const data = await res.json();
        removeTypingIndicator(typingEl);

        if (data.response) {
            const resp = data.response;

            if (resp.current_step) {
                currentStep = resp.current_step;
                highlightStep(currentStep);
            }

            addBotMessage(resp.text, resp.images || [], resp.is_guardrail, resp.cards);

            // Update quick actions contextually
            updateQuickActions();
        }
    } catch (err) {
        removeTypingIndicator(typingEl);
        addBotMessage("Sorry, something went wrong. Please try again.", []);
        console.error(err);
    }

    isLoading = false;
    sendBtn.disabled = false;
    userInput.focus();
}

// ─── Message Rendering ──────────────────────────────────────────

function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "message user";
    div.innerHTML = `
        <div class="message-avatar">🧑</div>
        <div class="message-content">${escapeHTML(text)}</div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addBotMessage(text, images = [], isGuardrail = false, cards = null) {
    const div = document.createElement("div");
    div.className = "message bot";

    let guardrailBadge = "";
    if (isGuardrail) {
        guardrailBadge = `<div class="guardrail-badge">⚡ Scope Notice</div>`;
    }

    let bodyHTML;
    let contentClass = "message-content";
    if (cards && cards.length > 0) {
        // Structured response — each element renders as its own clean box.
        contentClass += " has-cards";
        bodyHTML = renderCards(cards);
    } else {
        let imagesHTML = "";
        if (images && images.length > 0) {
            imagesHTML = `<div class="step-images">`;
            images.forEach((img) => {
                imagesHTML += `
                    <div class="step-image-card">
                        <img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.caption)}" loading="lazy" onerror="this.parentElement.style.display='none'">
                        <div class="image-caption">${escapeHTML(img.caption)}</div>
                    </div>
                `;
            });
            imagesHTML += `</div>`;
        }
        bodyHTML = renderMarkdown(text) + imagesHTML;
    }

    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="${contentClass}">
            ${guardrailBadge}
            ${bodyHTML}
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

// ─── Card Rendering (structured, "one thing at a time" boxes) ───────────────

function renderCards(cards) {
    return cards.map(renderCard).join("");
}

function cardTitleRow(emoji, title) {
    return `<div class="card-title-row">
        ${emoji ? `<span class="card-emoji">${emoji}</span>` : ""}
        <span class="card-title">${escapeHTML(title)}</span>
    </div>`;
}

function renderCard(card) {
    switch (card.type) {
        case "step": {
            const banner = card.image_url
                ? `<div class="card-banner"><img src="${escapeAttr(card.image_url)}" alt="${escapeAttr(card.title)}" loading="lazy" onerror="this.closest('.card-banner').remove()"></div>`
                : "";
            return `<div class="card card-step">
                ${banner}
                <div class="card-body">
                    <div class="card-title-row">
                        <span class="card-badge">Step ${escapeHTML(String(card.step))}</span>
                        <span class="card-title">${escapeHTML(card.title)}</span>
                    </div>
                    <div class="card-text">${renderMarkdown(card.instruction)}</div>
                    <div class="card-hint">Tap below for the science 🔬, the steps 📝, or safety 🦺</div>
                </div>
            </div>`;
        }
        case "concept":
            return `<div class="card card-concept">
                <div class="card-body">
                    ${cardTitleRow("🔬", card.title)}
                    <div class="card-text">${renderMarkdown(card.text)}</div>
                </div>
            </div>`;
        case "substeps":
            return `<div class="card">
                <div class="card-body">
                    ${cardTitleRow("📝", card.title)}
                    <ol class="card-ol">${card.items.map((i) => `<li>${renderMarkdown(i)}</li>`).join("")}</ol>
                </div>
            </div>`;
        case "safety": {
            const tools = (card.tools && card.tools.length)
                ? `<div class="card-tools-label">🧰 Tools you'll need</div>
                   <div class="c-chips">${card.tools.map((t) => `<span class="c-chip">${escapeHTML(t)}</span>`).join("")}</div>`
                : "";
            return `<div class="card card-safety">
                <div class="card-body">
                    ${cardTitleRow("🦺", card.title)}
                    <ul class="card-ul">${card.items.map((i) => `<li>${renderMarkdown(i)}</li>`).join("")}</ul>
                    ${tools}
                </div>
            </div>`;
        }
        case "list":
            return `<div class="card">
                <div class="card-body">
                    ${cardTitleRow(card.icon || "📋", card.title)}
                    <ul class="card-ul">${card.items.map((i) => `<li>${renderMarkdown(i)}</li>`).join("")}</ul>
                </div>
            </div>`;
        case "image": // reference image from a typed question — clean banner card
            return `<div class="card">
                <div class="card-banner"><img src="${escapeAttr(card.url)}" alt="${escapeAttr(card.caption || "")}" loading="lazy" onerror="this.closest('.card').remove()"></div>
                ${card.caption ? `<div class="card-body"><div class="card-cap">${escapeHTML(card.caption)}</div></div>` : ""}
            </div>`;
        case "text":
            return `<div class="card"><div class="card-body"><div class="card-text">${renderMarkdown(card.text)}</div></div></div>`;
        default:
            return card.text ? `<div class="card"><div class="card-body"><div class="card-text">${renderMarkdown(card.text)}</div></div></div>` : "";
    }
}

function addTypingIndicator() {
    const div = document.createElement("div");
    div.className = "message bot typing-msg";
    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ─── Quick Actions Update ───────────────────────────────────────

function updateQuickActions() {
    let buttons = [];
    if (currentStep) {
        buttons.push({ label: "📝 Sub-steps", msg: `Show sub-steps for step ${currentStep}` });
        buttons.push({ label: "🔬 Concept", msg: `What is the science concept for step ${currentStep}?` });
        buttons.push({ label: "⚠️ Safety", msg: `Safety tips for step ${currentStep}` });
        if (currentStep < totalSteps) {
            buttons.push({ label: "➡️ Next Step", msg: "Next step" });
        }
        if (currentStep > 1) {
            buttons.push({ label: "⬅️ Previous", msg: "Previous step" });
        }
    } else {
        buttons.push({ label: "📋 All Steps", msg: "Show all steps" });
        buttons.push({ label: "🚀 Start", msg: "Start from step 1" });
        buttons.push({ label: "🧰 Components", msg: "What components are in the kit?" });
        buttons.push({ label: "📖 Learning", msg: "What will I learn from this experiment?" });
    }

    quickActions.innerHTML = buttons
        .map((b) => `<button class="quick-btn" data-msg="${escapeAttr(b.msg)}">${b.label}</button>`)
        .join("");
}

// ─── Markdown-like Rendering ────────────────────────────────────

function renderMarkdown(text) {
    let html = escapeHTML(text);

    // Headers: ### text
    html = html.replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;color:var(--accent-light)">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="margin:10px 0 4px;color:var(--accent-light)">$1</h3>');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Numbered lists: "1. item" at start of line
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin-left:12px">$1. $2</div>');

    // Bullet lists: "- item" or "• item"
    html = html.replace(/^[-•]\s+(.+)$/gm, '<div style="margin-left:12px">• $1</div>');

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    // Clean up double <br> from list items
    html = html.replace(/<br><div/g, "<div");
    html = html.replace(/<\/div><br>/g, "</div>");

    return html;
}

// ─── Sanitization ───────────────────────────────────────────────

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
