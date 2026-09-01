import { useId } from "react";

export function Logo({
  size = 20,
  variant = "badge",
}: {
  size?: number;
  variant?: "badge" | "mark";
}) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {variant === "badge" && <rect width="40" height="40" rx="10" fill={`url(#${gradientId})`} />}
      <path
        d="M7 21h4.2l2.1-6.5L17.7 28l3.4-11.5 2 4.5h9.9"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {variant === "badge" && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5eead4" />
            <stop offset="0.55" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#0f766e" />
          </linearGradient>
        </defs>
      )}
    </svg>
  );
}
