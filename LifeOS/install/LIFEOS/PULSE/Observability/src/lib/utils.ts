import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    google: "🔍",
    bing: "🔍",
    duckduckgo: "🦆",
    twitter: "𝕏",
    x: "𝕏",
    linkedin: "💼",
    facebook: "📘",
    reddit: "🤖",
    hackernews: "🟠",
    youtube: "▶️",
    newsletter: "📧",
    "ul newsletter": "📧",
    tldrsec: "📧",
    chatgpt: "🤖",
    claude: "🤖",
    perplexity: "🤖",
    direct: "🔗",
    onsite: "➡️",
  };
  return icons[source.toLowerCase()] || "🌐";
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    search: "bg-blue-500",
    social: "bg-pink-500",
    newsletter: "bg-amber-500",
    ai: "bg-purple-500",
    direct: "bg-green-500",
    onsite: "bg-slate-500",
    external: "bg-cyan-500",
  };
  return colors[category.toLowerCase()] || "bg-gray-500";
}

export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// Country code to full name mapping
const countryNames: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  UK: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czech Republic",
  RO: "Romania",
  HU: "Hungary",
  GR: "Greece",
  IE: "Ireland",
  RU: "Russia",
  UA: "Ukraine",
  TR: "Turkey",
  IL: "Israel",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IN: "India",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  TW: "Taiwan",
  HK: "Hong Kong",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  AU: "Australia",
  NZ: "New Zealand",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  KE: "Kenya",
  MA: "Morocco",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  MM: "Myanmar",
  KH: "Cambodia",
  LA: "Laos",
  BG: "Bulgaria",
  HR: "Croatia",
  RS: "Serbia",
  SI: "Slovenia",
  SK: "Slovakia",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  IS: "Iceland",
  LU: "Luxembourg",
  MT: "Malta",
  CY: "Cyprus",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  JO: "Jordan",
  LB: "Lebanon",
  IQ: "Iraq",
  IR: "Iran",
  AF: "Afghanistan",
  UZ: "Uzbekistan",
  KZ: "Kazakhstan",
  EC: "Ecuador",
  VE: "Venezuela",
  UY: "Uruguay",
  PY: "Paraguay",
  BO: "Bolivia",
  CR: "Costa Rica",
  PA: "Panama",
  GT: "Guatemala",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicaragua",
  DO: "Dominican Republic",
  CU: "Cuba",
  JM: "Jamaica",
  PR: "Puerto Rico",
  TT: "Trinidad and Tobago",
  GH: "Ghana",
  TZ: "Tanzania",
  UG: "Uganda",
  ET: "Ethiopia",
  SN: "Senegal",
  CI: "Ivory Coast",
  CM: "Cameroon",
  AO: "Angola",
  MZ: "Mozambique",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  BW: "Botswana",
  NA: "Namibia",
  MU: "Mauritius",
  TN: "Tunisia",
  DZ: "Algeria",
  LY: "Libya",
  SD: "Sudan",
};

export function getCountryName(countryCode: string): string {
  if (!countryCode) return "";
  const code = countryCode.toUpperCase().trim();
  return countryNames[code] || countryCode;
}

/**
 * Clean page titles by trimming whitespace. Site/author-suffix stripping is
 * left to the principal's own customization (override via CUSTOMIZATIONS/SKILLS
 * or extend this function locally) — generic Pulse can't know which suffixes
 * any given user wants stripped.
 */
export function cleanTitle(title: string | undefined | null): string {
  if (!title) return "";
  return title.trim();
}
