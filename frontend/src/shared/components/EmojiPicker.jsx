import { useState } from "react";

const CATEGORIES = [
  {
    label: "Plátano",
    emojis: [
      "🍌","🥘","🍟","🥞","🧆","🥙","🫔","🥐",
      "🍩","🌯","🥧","🫓","🧇","🥖","🍕","🥗",
    ],
  },
  {
    label: "Frutas",
    emojis: [
      "🍎","🍊","🍋","🍇","🍓","🍑","🍒","🍍",
      "🥭","🍅","🫐","🍏","🍉","🍐","🥝","🍈",
      "🍌","🍒","🫒",
    ],
  },
  {
    label: "Verduras",
    emojis: [
      "🥕","🌽","🥦","🥬","🥒","🧄","🧅","🌶️",
      "🫑","🥑","🍆","🌿","🫛","🥜","🌱","🌾",
    ],
  },
  {
    label: "Insumos",
    emojis: [
      "🌾","🍯","🧂","🧈","🥚","🧀","🥩","🥓",
      "🛢️","🫚","🥫","🫙","🧃","🥤","🧋","🍵",
    ],
  },
  {
    label: "Empaque",
    emojis: [
      "📦","🧺","🏷️","🗂️","🛒","🧊","🥡","🛍️",
      "🪣","🧴","📬","🗃️","📫","🧻","🪤","📋",
    ],
  },
  {
    label: "General",
    emojis: [
      "⭐","💫","✨","🌟","🎯","📊","⚡","🔥",
      "💡","🎁","🏆","🌺","🌸","💎","⚙️","🛠️",
      "💼","📌","🔑","🏭","🧪","🔬","📱","💻",
    ],
  },
];

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState(0);
  const [custom, setCustom] = useState("");

  const select = (em) => { onChange(em); setOpen(false); };

  const applyCustom = () => {
    const v = custom.trim();
    if (v) { onChange(v); setCustom(""); setOpen(false); }
  };

  return (
    <div className="form-group">
      <label className="form-label">Ícono</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className={`icon-picker-trigger${open ? " open" : ""}`}
          onClick={() => setOpen(v => !v)}
        >
          {value}
        </button>
        <span style={{ fontSize: 12, color: "#9e9e9e" }}>
          {open ? "Elige un emoji o escribe el tuyo" : "Haz clic para cambiar el ícono"}
        </span>
      </div>

      {open && (
        <div className="emoji-picker-panel">
          <div className="emoji-picker-tabs">
            {CATEGORIES.map((c, i) => (
              <button
                key={c.label}
                className={`emoji-picker-tab${i === tab ? " active" : ""}`}
                onClick={() => setTab(i)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="icon-picker-grid">
            {CATEGORIES[tab].emojis.map(ic => (
              <button
                key={ic}
                className={`icon-option${value === ic ? " selected" : ""}`}
                onClick={() => select(ic)}
              >
                {ic}
              </button>
            ))}
          </div>

          <div className="emoji-picker-custom">
            <input
              className="emoji-custom-input"
              type="text"
              placeholder="Pega o escribe un emoji…"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyCustom()}
            />
            <button className="emoji-custom-btn" onClick={applyCustom}>Usar</button>
          </div>
        </div>
      )}
    </div>
  );
}
