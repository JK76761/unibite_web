import { getRestaurantMonogram } from "./restaurantDisplay";

type IllustrationKind =
  | "bowl"
  | "burger"
  | "cup"
  | "dessert"
  | "pizza"
  | "plate"
  | "sandwich"
  | "wrap";

type BrandTone = {
  accent: string;
  accentSoft: string;
  dark: string;
};

type Theme = BrandTone & {
  start: string;
  end: string;
  garnish: string;
  illustration: IllustrationKind;
};

type SpotOverride = {
  needles: string[];
  brandName?: string;
  chip?: string;
  cuisineLabel?: string;
  illustration?: IllustrationKind;
  theme?: Partial<Theme>;
};

export type RestaurantArtwork = {
  imageUrl: string;
  showMonogramOverlay: boolean;
  tone: BrandTone;
};

const cuisineThemes: Record<string, Theme> = {
  Burger: {
    start: "#fff4dd",
    end: "#fffaf1",
    accent: "#f58b1e",
    accentSoft: "#ffe2be",
    dark: "#8d4a0a",
    garnish: "#168a2b",
    illustration: "burger",
  },
  Burgers: {
    start: "#fff4dd",
    end: "#fffaf1",
    accent: "#f58b1e",
    accentSoft: "#ffe2be",
    dark: "#8d4a0a",
    garnish: "#168a2b",
    illustration: "burger",
  },
  BubbleTea: {
    start: "#fff3ec",
    end: "#fffaf7",
    accent: "#d97e3a",
    accentSoft: "#ffe0cc",
    dark: "#7d3815",
    garnish: "#168a2b",
    illustration: "cup",
  },
  "Bubble Tea": {
    start: "#fff3ec",
    end: "#fffaf7",
    accent: "#d97e3a",
    accentSoft: "#ffe0cc",
    dark: "#7d3815",
    garnish: "#168a2b",
    illustration: "cup",
  },
  Cafe: {
    start: "#f7efe3",
    end: "#fffaf5",
    accent: "#9b5d2e",
    accentSoft: "#ead5bf",
    dark: "#5b3418",
    garnish: "#168a2b",
    illustration: "cup",
  },
  "Casual Eatery": {
    start: "#edf7ef",
    end: "#f9fcf8",
    accent: "#168a2b",
    accentSoft: "#d8eedc",
    dark: "#0f5720",
    garnish: "#f58b1e",
    illustration: "plate",
  },
  Chinese: {
    start: "#fff0ea",
    end: "#fff9f7",
    accent: "#e86e2b",
    accentSoft: "#ffd2c0",
    dark: "#83330f",
    garnish: "#168a2b",
    illustration: "plate",
  },
  "Coffee Shop": {
    start: "#f5eee5",
    end: "#fffaf6",
    accent: "#8b5832",
    accentSoft: "#e9d7c6",
    dark: "#52311a",
    garnish: "#168a2b",
    illustration: "cup",
  },
  Dessert: {
    start: "#fff0ef",
    end: "#fffafb",
    accent: "#ef709d",
    accentSoft: "#ffd7e5",
    dark: "#923257",
    garnish: "#f58b1e",
    illustration: "dessert",
  },
  Greek: {
    start: "#eef6ff",
    end: "#fbfdff",
    accent: "#4f8fce",
    accentSoft: "#d8e9fb",
    dark: "#1d4a73",
    garnish: "#168a2b",
    illustration: "wrap",
  },
  Healthy: {
    start: "#e8f6ea",
    end: "#f7fcf7",
    accent: "#168a2b",
    accentSoft: "#d0edd6",
    dark: "#0f5720",
    garnish: "#f58b1e",
    illustration: "plate",
  },
  Indian: {
    start: "#fff2e4",
    end: "#fffaf5",
    accent: "#de7833",
    accentSoft: "#ffd6b9",
    dark: "#8b3e14",
    garnish: "#168a2b",
    illustration: "plate",
  },
  International: {
    start: "#edf7ef",
    end: "#fff7ee",
    accent: "#168a2b",
    accentSoft: "#d8eedc",
    dark: "#0f5720",
    garnish: "#f58b1e",
    illustration: "plate",
  },
  Italian: {
    start: "#fff2e6",
    end: "#fffaf4",
    accent: "#d7662a",
    accentSoft: "#ffd7bf",
    dark: "#7d3013",
    garnish: "#168a2b",
    illustration: "pizza",
  },
  Japanese: {
    start: "#fff2eb",
    end: "#fffaf8",
    accent: "#f58b1e",
    accentSoft: "#ffe1c9",
    dark: "#8a4516",
    garnish: "#168a2b",
    illustration: "bowl",
  },
  Juice: {
    start: "#eef9e7",
    end: "#fbfef8",
    accent: "#51a64b",
    accentSoft: "#d7efcb",
    dark: "#23581f",
    garnish: "#f58b1e",
    illustration: "cup",
  },
  Korean: {
    start: "#fff1ea",
    end: "#fff9f7",
    accent: "#ee6d3d",
    accentSoft: "#ffd3c4",
    dark: "#8b3418",
    garnish: "#168a2b",
    illustration: "bowl",
  },
  Malaysian: {
    start: "#fff6e5",
    end: "#fffdf7",
    accent: "#f0a623",
    accentSoft: "#ffe8b8",
    dark: "#82520f",
    garnish: "#168a2b",
    illustration: "bowl",
  },
  Mediterranean: {
    start: "#eef7f4",
    end: "#fbfdfc",
    accent: "#1f8a63",
    accentSoft: "#d5efe5",
    dark: "#16503c",
    garnish: "#f58b1e",
    illustration: "wrap",
  },
  Mexican: {
    start: "#fff2e5",
    end: "#fffaf4",
    accent: "#eb7c28",
    accentSoft: "#ffd8bb",
    dark: "#884114",
    garnish: "#168a2b",
    illustration: "wrap",
  },
  Pizza: {
    start: "#fff1e3",
    end: "#fffaf4",
    accent: "#ef7f2e",
    accentSoft: "#ffd6bb",
    dark: "#873713",
    garnish: "#168a2b",
    illustration: "pizza",
  },
  Sandwich: {
    start: "#f8f2de",
    end: "#fffdf6",
    accent: "#c88a28",
    accentSoft: "#f0dfb0",
    dark: "#6e4a14",
    garnish: "#168a2b",
    illustration: "sandwich",
  },
  Sandwiches: {
    start: "#f8f2de",
    end: "#fffdf6",
    accent: "#c88a28",
    accentSoft: "#f0dfb0",
    dark: "#6e4a14",
    garnish: "#168a2b",
    illustration: "sandwich",
  },
  Seafood: {
    start: "#eef8ff",
    end: "#fbfdff",
    accent: "#338dd0",
    accentSoft: "#d7ecfb",
    dark: "#18466d",
    garnish: "#19a66c",
    illustration: "plate",
  },
  Sushi: {
    start: "#fff4ec",
    end: "#fffaf7",
    accent: "#ea7f42",
    accentSoft: "#ffd9c3",
    dark: "#813917",
    garnish: "#168a2b",
    illustration: "plate",
  },
  Thai: {
    start: "#fff3ea",
    end: "#fffaf8",
    accent: "#ef7b36",
    accentSoft: "#ffd5c1",
    dark: "#8b3d17",
    garnish: "#168a2b",
    illustration: "bowl",
  },
  Turkish: {
    start: "#fff2e8",
    end: "#fffaf6",
    accent: "#d56f35",
    accentSoft: "#ffd9c4",
    dark: "#7d3818",
    garnish: "#168a2b",
    illustration: "wrap",
  },
  Vietnamese: {
    start: "#f0f8e8",
    end: "#fbfdf7",
    accent: "#4a9b42",
    accentSoft: "#d8efcf",
    dark: "#24591f",
    garnish: "#f58b1e",
    illustration: "wrap",
  },
};

const defaultTheme: Theme = {
  start: "#edf7ef",
  end: "#f8fcf8",
  accent: "#168a2b",
  accentSoft: "#d8eedc",
  dark: "#0f5720",
  garnish: "#f58b1e",
  illustration: "plate",
};

const spotOverrides: SpotOverride[] = [
  {
    needles: ["capstone cafe"],
    chip: "Study break",
    theme: {
      start: "#f6efe6",
      end: "#fffaf6",
      accent: "#a56631",
      accentSoft: "#ead8c6",
      dark: "#59331a",
    },
    illustration: "cup",
  },
  {
    needles: ["blackboard bao"],
    chip: "Campus fave",
    theme: {
      start: "#f1f6ee",
      end: "#fdfefc",
      accent: "#2f8f48",
      accentSoft: "#d4edd7",
      dark: "#184d27",
    },
    illustration: "bowl",
  },
  {
    needles: ["riverfront ramen"],
    chip: "Warm up",
    theme: {
      start: "#fff1e8",
      end: "#fffaf7",
      accent: "#f0893c",
      accentSoft: "#ffdcc2",
      dark: "#813d18",
    },
    illustration: "bowl",
  },
  {
    needles: ["studio sandwich co"],
    brandName: "Studio Sandwich",
    chip: "Grab and go",
    theme: {
      start: "#faf4df",
      end: "#fffdf7",
      accent: "#c39229",
      accentSoft: "#f2e3b3",
      dark: "#6b4d15",
    },
    illustration: "sandwich",
  },
  {
    needles: ["subway"],
    chip: "Fast lunch",
    theme: {
      start: "#edf9ea",
      end: "#fbfef8",
      accent: "#17963a",
      accentSoft: "#d6f1da",
      dark: "#114f25",
      garnish: "#f2c531",
    },
    illustration: "sandwich",
  },
  {
    needles: ["merlo coffee"],
    chip: "Coffee run",
    theme: {
      start: "#f6edea",
      end: "#fffaf8",
      accent: "#8e4b40",
      accentSoft: "#e7cfc9",
      dark: "#4f241d",
    },
    illustration: "cup",
  },
  {
    needles: ["saint lucy caffe e cucina"],
    brandName: "Saint Lucy",
    chip: "Long lunch",
    theme: {
      start: "#fff3e9",
      end: "#fffaf6",
      accent: "#cc6e32",
      accentSoft: "#ffd6c0",
      dark: "#6d2d14",
    },
    illustration: "pizza",
  },
  {
    needles: ["patina at alumni court", "pop-up by patina"],
    brandName: "Patina",
    chip: "Polished pick",
    theme: {
      start: "#edf4ef",
      end: "#fbfdfb",
      accent: "#5c8d62",
      accentSoft: "#d9e8db",
      dark: "#29422c",
    },
    illustration: "plate",
  },
  {
    needles: ["max brenner"],
    chip: "Sweet fix",
    theme: {
      start: "#fbefe8",
      end: "#fff9f6",
      accent: "#8d523d",
      accentSoft: "#e9d0c3",
      dark: "#4e281b",
      garnish: "#d98e4a",
    },
    illustration: "dessert",
  },
  {
    needles: ["otto ristorante", "otto osteria"],
    brandName: "Otto",
    chip: "Waterfront dinner",
    theme: {
      start: "#fff1e8",
      end: "#fffaf8",
      accent: "#de6d33",
      accentSoft: "#ffd9c6",
      dark: "#752d12",
    },
    illustration: "pizza",
  },
  {
    needles: ["river quay fish"],
    chip: "Fresh catch",
    theme: {
      start: "#eef8ff",
      end: "#fbfdff",
      accent: "#287fc1",
      accentSoft: "#d6ebfa",
      dark: "#173e60",
      garnish: "#1c9a6a",
    },
    illustration: "plate",
  },
  {
    needles: ["uq union main course food precinct"],
    brandName: "Main Course",
    chip: "Big choice",
    cuisineLabel: "Food precinct",
  },
  {
    needles: ["uq union physiol eatery", "physiol eatery"],
    brandName: "Physiol Eatery",
    chip: "Quick refuel",
    cuisineLabel: "Cafe and eatery",
  },
  {
    needles: ["pita deli"],
    chip: "Fresh lunch",
    theme: {
      start: "#eef7f3",
      end: "#fbfdfc",
      accent: "#168a63",
      accentSoft: "#d3ede4",
      dark: "#114636",
    },
    illustration: "wrap",
  },
  {
    needles: ["banh boy"],
    chip: "Fast and fresh",
    theme: {
      start: "#f2f9e9",
      end: "#fbfdf8",
      accent: "#5a9b31",
      accentSoft: "#dceec8",
      dark: "#2c5c19",
    },
    illustration: "sandwich",
  },
  {
    needles: ["seoul kitchen"],
    chip: "Student fave",
    theme: {
      start: "#fff0ea",
      end: "#fffaf7",
      accent: "#ee6e43",
      accentSoft: "#ffd4c7",
      dark: "#8a3418",
    },
    illustration: "bowl",
  },
];

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTheme(cuisine: string) {
  return cuisineThemes[cuisine] ?? defaultTheme;
}

function getSpotOverride(restaurantName: string) {
  const normalizedName = normalizeKey(restaurantName);

  return spotOverrides.find((item) =>
    item.needles.some((needle) => normalizedName.includes(needle)),
  );
}

function resolveTheme(restaurantName: string, cuisine: string): Theme {
  const theme = getTheme(cuisine);
  const override = getSpotOverride(restaurantName);

  return {
    ...theme,
    ...override?.theme,
    illustration: override?.illustration ?? theme.illustration,
  };
}

function getChipLabel(cuisine: string) {
  switch (cuisine) {
    case "Cafe":
    case "Coffee Shop":
      return "Coffee run";
    case "Bubble Tea":
      return "Sweet sip";
    case "Dessert":
      return "Sweet fix";
    case "Japanese":
    case "Sushi":
      return "Lunch pick";
    case "Burger":
    case "Burgers":
      return "Quick bite";
    case "Sandwich":
    case "Sandwiches":
      return "Grab and go";
    case "Mexican":
      return "Shareable";
    default:
      return "Campus pick";
  }
}

function getDisplayName(restaurantName: string) {
  return getSpotOverride(restaurantName)?.brandName ?? restaurantName;
}

function getCuisineLabel(restaurantName: string, cuisine: string) {
  return getSpotOverride(restaurantName)?.cuisineLabel ?? cuisine;
}

function getResolvedChipLabel(restaurantName: string, cuisine: string) {
  return getSpotOverride(restaurantName)?.chip ?? getChipLabel(cuisine);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function splitLabel(value: string, maxLength: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return ["UniBite"];
  }

  const lines: string[] = [];
  let current = "";

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (lines.length === maxLines - 1) {
      const remainder = [current, ...words.slice(index)].filter(Boolean).join(" ");
      lines.push(truncateLabel(remainder, maxLength + 4));
      return lines;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    lines.push(truncateLabel(word, maxLength));
    current = "";
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function buildIllustration(
  kind: IllustrationKind,
  accent: string,
  accentSoft: string,
  garnish: string,
  dark: string,
) {
  switch (kind) {
    case "bowl":
      return `
        <ellipse cx="104" cy="124" rx="48" ry="14" fill="${dark}" opacity="0.14"/>
        <path d="M58 118h92c0 27-20 44-46 44s-46-17-46-44Z" fill="${accent}" />
        <path d="M72 110c8-20 20-30 33-30 13 0 25 10 35 30" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="83" cy="100" r="9" fill="${garnish}" />
        <circle cx="103" cy="92" r="8" fill="#fff6d9" />
        <circle cx="123" cy="102" r="8" fill="${garnish}" />
        <path d="M84 72c0-12 8-18 8-29M108 72c0-12 8-18 8-29" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.2"/>
      `;
    case "burger":
      return `
        <rect x="58" y="126" width="92" height="14" rx="7" fill="${dark}" opacity="0.14"/>
        <path d="M62 118c4-23 21-36 43-36 24 0 41 13 45 36H62Z" fill="${accent}" />
        <rect x="60" y="120" width="88" height="14" rx="7" fill="#6f4d36" />
        <rect x="65" y="110" width="78" height="8" rx="4" fill="${garnish}" />
        <rect x="66" y="136" width="76" height="15" rx="7" fill="#f3c56e" />
        <circle cx="88" cy="100" r="3" fill="#fff7df" />
        <circle cx="105" cy="96" r="3" fill="#fff7df" />
        <circle cx="122" cy="100" r="3" fill="#fff7df" />
      `;
    case "cup":
      return `
        <rect x="79" y="70" width="54" height="78" rx="18" fill="${accent}" />
        <path d="M133 84h12c11 0 20 9 20 20s-9 20-20 20h-12" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>
        <path d="M91 62c0-12 9-18 9-28M114 62c0-12 9-18 9-28" fill="none" stroke="${garnish}" stroke-width="5" stroke-linecap="round"/>
        <rect x="73" y="148" width="66" height="10" rx="5" fill="${dark}" opacity="0.16"/>
        <circle cx="103" cy="108" r="10" fill="${accentSoft}" />
      `;
    case "dessert":
      return `
        <ellipse cx="104" cy="126" rx="48" ry="14" fill="${dark}" opacity="0.14"/>
        <rect x="70" y="116" width="68" height="26" rx="10" fill="${accent}" />
        <path d="M74 116c6-17 17-26 31-26 15 0 27 9 33 26H74Z" fill="#fff3f7" />
        <path d="M80 111c13 8 34 8 47 0" stroke="${garnish}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="90" cy="88" r="8" fill="${accentSoft}" />
        <circle cx="104" cy="82" r="9" fill="${accent}" />
        <circle cx="119" cy="88" r="8" fill="${accentSoft}" />
      `;
    case "pizza":
      return `
        <path d="M75 78c22-12 49-12 73 0l-37 84L75 78Z" fill="${accent}" />
        <path d="M80 81c21-9 45-9 63 0" stroke="#f7d8aa" stroke-width="9" stroke-linecap="round" />
        <circle cx="98" cy="105" r="8" fill="${garnish}" />
        <circle cx="119" cy="116" r="8" fill="#fff0d8" />
        <circle cx="112" cy="97" r="7" fill="${garnish}" />
        <ellipse cx="104" cy="142" rx="40" ry="11" fill="${dark}" opacity="0.12"/>
      `;
    case "sandwich":
      return `
        <rect x="57" y="126" width="94" height="14" rx="7" fill="${dark}" opacity="0.12"/>
        <path d="M64 92h80c11 0 20 9 20 20v8H44v-8c0-11 9-20 20-20Z" fill="${accent}" />
        <rect x="54" y="104" width="100" height="13" rx="6.5" fill="#fff4da" />
        <rect x="58" y="112" width="92" height="8" rx="4" fill="${garnish}" />
        <rect x="57" y="120" width="94" height="15" rx="7.5" fill="#e6b46e" />
        <circle cx="82" cy="86" r="5" fill="${accentSoft}" />
        <circle cx="126" cy="84" r="5" fill="${accentSoft}" />
      `;
    case "wrap":
      return `
        <path d="M72 90c20-25 57-27 78-9 20 16 24 46 9 71l-87-62Z" fill="${accent}" />
        <path d="M86 92c12 4 22 11 30 24" stroke="${garnish}" stroke-width="10" stroke-linecap="round" />
        <path d="M98 111c12 1 21 5 32 15" stroke="#fff0d8" stroke-width="9" stroke-linecap="round" />
        <path d="M78 90c28-18 58-18 80 3" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity="0.14" />
        <ellipse cx="108" cy="140" rx="40" ry="10" fill="${dark}" opacity="0.12"/>
      `;
    case "plate":
    default:
      return `
        <circle cx="104" cy="110" r="46" fill="${accent}" opacity="0.16" />
        <circle cx="104" cy="110" r="35" fill="#ffffff" />
        <ellipse cx="104" cy="110" rx="25" ry="18" fill="${accent}" />
        <circle cx="90" cy="104" r="8" fill="${garnish}" />
        <circle cx="118" cy="116" r="9" fill="#fff1d9" />
        <circle cx="111" cy="97" r="7" fill="${garnish}" />
        <path d="M60 145h88" stroke="${dark}" stroke-width="8" stroke-linecap="round" opacity="0.12"/>
      `;
  }
}

function toDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildNameLines(name: string) {
  return splitLabel(name, 18, 2).map((line) => escapeXml(line));
}

function buildSvg(restaurantName: string, cuisine: string) {
  const theme = resolveTheme(restaurantName, cuisine);
  const logo = escapeXml(getRestaurantMonogram(restaurantName));
  const displayName = getDisplayName(restaurantName);
  const cuisineLabel = truncateLabel(getCuisineLabel(restaurantName, cuisine), 24);
  const chipLabel = truncateLabel(getResolvedChipLabel(restaurantName, cuisine), 18);
  const nameLines = buildNameLines(displayName);
  const chipWidth = Math.min(172, Math.max(92, chipLabel.length * 8 + 24));
  const cuisineY = nameLines.length > 1 ? 291 : 278;
  const nameFontSize = nameLines.length > 1 ? 25 : 28;

  const nameMarkup = nameLines
    .map((line, index) => {
      const y = 250 + index * 28;
      return `<text x="30" y="${y}" font-family="Manrope, Arial, sans-serif" font-size="${nameFontSize}" font-weight="800" fill="${theme.dark}">${line}</text>`;
    })
    .join("");

  return `
    <svg width="320" height="320" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="28" y1="20" x2="290" y2="292" gradientUnits="userSpaceOnUse">
          <stop stop-color="${theme.start}" />
          <stop offset="1" stop-color="${theme.end}" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="34" fill="url(#bg)" />
      <circle cx="258" cy="58" r="42" fill="${theme.accentSoft}" />
      <circle cx="48" cy="255" r="52" fill="${theme.accentSoft}" opacity="0.75" />
      <rect x="22" y="22" width="62" height="62" rx="20" fill="${theme.dark}" />
      <text x="53" y="61" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="27" font-weight="800" fill="white">${logo}</text>
      <rect x="96" y="30" width="${chipWidth}" height="30" rx="15" fill="white" fill-opacity="0.82" />
      <text x="${96 + chipWidth / 2}" y="50" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="14" font-weight="700" fill="${theme.dark}">${escapeXml(chipLabel)}</text>
      <g transform="translate(62 34)">
        ${buildIllustration(
          theme.illustration,
          theme.accent,
          theme.accentSoft,
          theme.garnish,
          theme.dark,
        )}
      </g>
      <rect x="18" y="214" width="284" height="88" rx="24" fill="white" fill-opacity="0.94" />
      <rect x="30" y="226" width="44" height="5" rx="2.5" fill="${theme.accent}" />
      ${nameMarkup}
      <text x="30" y="${cuisineY}" font-family="Manrope, Arial, sans-serif" font-size="16" font-weight="700" fill="${theme.accent}">${escapeXml(cuisineLabel)}</text>
    </svg>
  `;
}

export function getRestaurantImageUrl(restaurantName: string, cuisine: string) {
  return toDataUri(buildSvg(restaurantName, cuisine));
}

export function getRestaurantBrandTone(cuisine: string, restaurantName?: string): BrandTone {
  const theme =
    restaurantName === undefined
      ? getTheme(cuisine)
      : resolveTheme(restaurantName, cuisine);

  return {
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    dark: theme.dark,
  };
}

export function getRestaurantArtwork(
  restaurantName: string,
  cuisine: string,
  photoUrl?: string | null,
): RestaurantArtwork {
  return {
    imageUrl: photoUrl ?? getRestaurantImageUrl(restaurantName, cuisine),
    showMonogramOverlay: Boolean(photoUrl),
    tone: getRestaurantBrandTone(cuisine, restaurantName),
  };
}
