import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export function FloatingHearts({ count = 14 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hearts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 10 + Math.random() * 22,
        delay: Math.random() * 8,
        duration: 12 + Math.random() * 12,
        opacity: 0.12 + Math.random() * 0.25,
      })),
    [count],
  );
  if (!mounted) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{ y: "-15vh", opacity: [0, h.opacity, h.opacity, 0], rotate: [0, 18, -12, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: "linear" }}
          style={{ left: `${h.left}%`, position: "absolute", fontSize: h.size }}
        >
          💗
        </motion.div>
      ))}
    </div>
  );
}