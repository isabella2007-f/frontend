export default function CharCount({ value = "", max, min }) {
  const len = value.length;
  const warn = len >= Math.floor(max * 0.85) || (min && len > 0 && len < min);
  return (
    <span style={{
      fontSize: 11, fontWeight: 400, letterSpacing: 0,
      color: warn ? "#e65100" : "#9e9e9e",
    }}>
      {min ? `mín. ${min} · ` : ""}{len}/{max}
    </span>
  );
}
