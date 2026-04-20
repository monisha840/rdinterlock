import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nearTop = scrollY < 120;
      const nearBottom = docHeight - scrollY < 120;

      setVisible(docHeight > 300);

      if (nearBottom) setDirection("up");
      else if (nearTop) setDirection("down");
      else setDirection(scrollY < docHeight / 2 ? "down" : "up");
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleClick = () => {
    if (direction === "up") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={direction === "up" ? "Scroll to top" : "Scroll to bottom"}
      className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 hover:shadow-xl transition-all duration-200 animate-in fade-in"
    >
      {direction === "up" ? (
        <ArrowUp className="h-5 w-5" />
      ) : (
        <ArrowDown className="h-5 w-5" />
      )}
    </button>
  );
};
