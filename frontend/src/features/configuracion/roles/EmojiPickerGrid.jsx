import { useState } from "react";

const CATEGORIES = [
  {
    label: "Personas",
    emojis: ["👤","👑","💼","👷","🧑‍🍳","🧑‍💻","🧑‍🔧","🕵️","👮","🧑‍🏫","🤝","🧑‍🎨"],
  },
  {
    label: "Entrega",
    emojis: ["🛵","🚗","🚚","📦","🚀","🚲","📬","🛺"],
  },
  {
    label: "Ventas",
    emojis: ["🛒","🏪","💰","💵","🧾","📈","🏷️","💳"],
  },
  {
    label: "Gestión",
    emojis: ["📊","⚙️","🔧","🔑","🛡️","🔍","📋","🗝️","📢","📌","🗂️","✅"],
  },
  {
    label: "Producción",
    emojis: ["🥑","🍽️","🍳","🌿","🥘","🌾","🫙","🧪"],
  },
  {
    label: "Otros",
    emojis: null, // entrada libre: cualquier emoji
  },
];

// Toma el primer "carácter" visible (soporta emojis de varios code points).
function primerEmoji(texto) {
  const limpio = (texto || "").trim();
  if (!limpio) return "";
  try {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    return [...seg.segment(limpio)][0]?.segment ?? limpio;
  } catch {
    return [...limpio][0] ?? limpio;
  }
}

export default function EmojiPickerGrid({ selected, onSelect }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [libre, setLibre] = useState("");
  const cat = CATEGORIES[activeIdx];

  const usarLibre = () => {
    const emoji = primerEmoji(libre);
    if (emoji) { onSelect(emoji); setLibre(""); }
  };

  return (
    <div className="emoji-picker-panel">
      <div className="emoji-picker-tabs">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            className={`emoji-picker-tab${i === activeIdx ? " active" : ""}`}
            onClick={() => setActiveIdx(i)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cat.emojis ? (
        <div className="icon-picker-grid">
          {cat.emojis.map(ic => (
            <button
              key={ic}
              className={`icon-option${selected === ic ? " selected" : ""}`}
              onClick={() => onSelect(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
      ) : (
        <div className="emoji-picker-libre">
          <input
            type="text"
            className="field-input"
            placeholder="Pega o escribe un emoji…"
            value={libre}
            onChange={e => setLibre(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); usarLibre(); } }}
            maxLength={8}
          />
          <button type="button" className="icon-change-btn" onClick={usarLibre} disabled={!primerEmoji(libre)}>
            Usar {primerEmoji(libre)}
          </button>
        </div>
      )}
    </div>
  );
}
