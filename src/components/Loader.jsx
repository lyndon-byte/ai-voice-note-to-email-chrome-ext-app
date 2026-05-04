 
// Keyframes injected once via a style tag
const styles = `
  @keyframes bounce-dot {
    0%, 100% { transform: translateY(0);    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); }
    30%      { transform: translateY(-60%); animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); }
    60%      { transform: translateY(-20%); animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); }
    80%      { transform: translateY(-8%);  animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); }
  }
 
  .dot {
    animation: bounce-dot 0.9s infinite;
  }
  .dot:nth-child(1) { animation-delay: 0s;    }
  .dot:nth-child(2) { animation-delay: 0.15s; }
  .dot:nth-child(3) { animation-delay: 0.3s;  }
`;
 
/**
 * Loader
 *
 * Props:
 *  color   – Tailwind bg-* class  (default: "bg-emerald-400")
 *  size    – "sm" | "md" | "lg"   (default: "md")
 *  label   – accessible label     (default: "Loading…")
 */
export function Loader({
  color = "bg-emerald-400",
  size = "md",
  label = "Loading…",
}) {
  const sizeMap = {
    sm: "w-2.5 h-2.5 gap-1.5",
    md: "w-4 h-4 gap-2.5",
    lg: "w-6 h-6 gap-3.5",
  };
 
  const [dotSize, gap] = sizeMap[size].split(" gap-");
  const dotClass = `${dotSize} rounded-full ${color} dot`;
  const wrapClass = `flex items-center gap-${gap}`;
 
  return (
    <>
        <style>{styles}</style>
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-16 font-sans">

            <div role="status" aria-label={label} className={wrapClass}>
                <span className={dotClass} />
                <span className={dotClass} />
                <span className={dotClass} />
                <span className="sr-only">{label}</span>
            </div>
            
        </div>
    </>
  );
}