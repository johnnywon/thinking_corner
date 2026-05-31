import FactBar from "./FactBar.jsx";

export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <span className="kicker">thinking_corner</span>
        <h1>FactBar</h1>
        <p>
          A tiny terminal-style ticker that lives in the corner of your app and
          types a fresh fact, one character at a time. Tap it for another.
        </p>
      </section>
      <FactBar />
    </main>
  );
}
