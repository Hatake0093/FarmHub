import { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "error";

export default function App() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => setHealth(res.ok ? "ok" : "error"))
      .catch(() => setHealth("error"));
  }, []);

  return (
    <main>
      <h1>Minecraft FarmHub</h1>
      <p>Backend: {health}</p>
    </main>
  );
}
