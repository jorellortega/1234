import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
}

const SunStoneIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="1" />
    <path d="M12 5V3" />
    <path d="M12 21v-2" />
    <path d="M5 12H3" />
    <path d="M21 12h-2" />
    <path d="m16.24 7.76-1.41-1.41" />
    <path d="m9.17 14.83-1.41-1.41" />
    <path d="m16.24 16.24-1.41 1.41" />
    <path d="m9.17 9.17-1.41 1.41" />
  </svg>
)

const SerpentIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12h12" />
    <path d="M6 12a6 6 0 0 1-6-6h0" />
    <path d="M18 12a6 6 0 0 0 6-6h0" />
    <path d="M6 12a6 6 0 0 0-6 6h0" />
    <path d="M18 12a6 6 0 0 1 6 6h0" />
    <path d="M5 11l-1 1 1 1" />
    <path d="M19 11l1 1-1 1" />
  </svg>
)

const JaguarIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l4 4h-8z" />
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <path d="M10 12h4" />
    <path d="M9 16c.5-1 1.5-2 3-2s2.5 1 3 2" />
  </svg>
)

type AztecIconProps = {
  name: "sun-stone" | "serpent" | "jaguar"
  className?: string
}

export function AztecIcon({ name, className }: AztecIconProps) {
  const components = {
    "sun-stone": SunStoneIcon,
    serpent: SerpentIcon,
    jaguar: JaguarIcon,
  }
  const IconComponent = components[name]
  return <IconComponent className={cn("h-4 w-4", className)} />
}
