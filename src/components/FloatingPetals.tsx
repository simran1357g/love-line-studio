export function FloatingPetals() {
  const petals = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {petals.map((_, i) => {
        const left = (i * 7 + 5) % 100;
        const duration = 18 + (i % 5) * 4;
        const delay = (i * 1.3) % 12;
        const size = 12 + (i % 4) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              bottom: "-40px",
              width: `${size}px`,
              height: `${size}px`,
              background: `radial-gradient(circle at 30% 30%, oklch(0.82 0.15 15), oklch(0.55 0.2 12))`,
              borderRadius: "50% 10% 50% 10%",
              opacity: 0.55,
              filter: "blur(0.5px)",
              animation: `float-up ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}