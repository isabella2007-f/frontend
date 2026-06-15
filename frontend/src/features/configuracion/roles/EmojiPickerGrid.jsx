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
];

export default function EmojiPickerGrid({ selected, onSelect }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cat = CATEGORIES[activeIdx];

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
    </div>
  );
}
