export default function Flash({ message }) {
  if (!message) return null;
  return (
    <div className="flashes">
      <div className={`flash ${message.type}`}>{message.text}</div>
    </div>
  );
}
