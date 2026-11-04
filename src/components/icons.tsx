import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'chat'
  | 'users'
  | 'fileText'
  | 'grid'
  | 'settings'
  | 'plus'
  | 'qr'
  | 'scan'
  | 'card'
  | 'printer'
  | 'download'
  | 'upload'
  | 'trash'
  | 'edit'
  | 'star'
  | 'search'
  | 'chevronLeft'
  | 'chevronRight'
  | 'arrowLeft'
  | 'arrowRight'
  | 'arrowUpRight'
  | 'copy'
  | 'share'
  | 'check'
  | 'x'
  | 'lock'
  | 'unlock'
  | 'moon'
  | 'sun'
  | 'globe'
  | 'bell'
  | 'chart'
  | 'database'
  | 'contact'
  | 'briefcase'
  | 'user'
  | 'phone'
  | 'whatsapp'
  | 'camera'
  | 'image'
  | 'link'
  | 'alert'
  | 'info'
  | 'key'
  | 'shield'
  | 'folder'
  | 'refresh'
  | 'eye'
  | 'eyeOff'
  | 'calendar'
  | 'send'
  | 'filter'
  | 'more'
  | 'bookmark'
  | 'sparkles'
  | 'clipboard'
  | 'install'
  | 'logout'
  | 'wifiOff'
  | 'flame'
  | 'backspace';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
  strokeWidth?: number;
}

const FILLED: IconName[] = ['whatsapp'];

const PATHS: Record<IconName, ReactNode> = {
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5Z" />,
  users: (
    <>
      <path d="M16 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21" />
      <circle cx="9" cy="7" r="3.4" />
      <path d="M22 21v-1.8a4 4 0 0 0-3-3.8M16.5 3.6a3.4 3.4 0 0 1 0 6.6" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 2.8h8.2L19 7.6V21H6z" />
      <path d="M14 2.8v5h5M9 12h7M9 16h5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.4" height="7.4" rx="2" />
      <rect x="13.6" y="3" width="7.4" height="7.4" rx="2" />
      <rect x="3" y="13.6" width="7.4" height="7.4" rx="2" />
      <rect x="13.6" y="13.6" width="7.4" height="7.4" rx="2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.3.55.86.94 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.63.05-1.2.4-1.51 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <path d="M14 14h3v3h-3zM18.5 18.5H21V21h-2.5z" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 9.5h19M6 14.5h4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3h10v5M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17" />
      <rect x="7" y="13" width="10" height="8" rx="1.5" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />,
  upload: <path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5M4 20h16" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13.5h10L18 7M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  star: <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  arrowLeft: <path d="M20 12H4m0 0 6-6M4 12l6 6" />,
  arrowRight: <path d="M4 12h16m0 0-6-6m6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  copy: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2.2" />
      <path d="M5.5 14.5H5A1.5 1.5 0 0 1 3.5 13V5A1.5 1.5 0 0 1 5 3.5h8A1.5 1.5 0 0 1 14.5 5v.5" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.3 13.4 7.4-5.2M8.3 10.6l7.4 5.2" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="m5 5 14 14M19 5 5 19" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  moon: <path d="M20.5 13.1A8.6 8.6 0 1 1 10.9 3.5a7 7 0 0 0 9.6 9.6Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9.5h17M3.5 14.5h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9Z" />
      <path d="M10.2 20a2 2 0 0 0 3.6 0" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8 17v-5M12.6 17V8M17.2 17v-8.5" />,
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="9.5" r="2.6" />
      <path d="M7.5 18a5 5 0 0 1 9 0" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7M3 12.5h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  phone: <path d="M21 16.9v2.4a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3 19.3 19.3 0 0 1-5.9-6A19.6 19.6 0 0 1 1.3 3.7 2 2 0 0 1 3.3 1.5H5.7A2 2 0 0 1 7.7 3.2a12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.4 2.1L6.9 9.2a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />,
  whatsapp: (
    <path
      fill="currentColor"
      stroke="none"
      d="M17.5 14.4c-.3-.15-1.7-.85-2-1-.3-.1-.5-.15-.7.15-.2.3-.8 1-1 1.2-.2.2-.35.25-.65.1-.3-.15-1.25-.5-2.4-1.55-.9-.8-1.5-1.8-1.65-2.1-.15-.3-.02-.45.13-.6.13-.13.3-.35.45-.5.15-.15.2-.3.3-.5.1-.2.05-.4-.02-.55-.08-.15-.68-1.65-.93-2.25-.25-.6-.5-.5-.7-.5h-.6c-.2 0-.5.07-.8.37-.3.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.1 4.5.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.8-.73 2.05-1.43.25-.7.25-1.3.18-1.43-.08-.12-.28-.2-.58-.35Z"
    />
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.4-2.2h7.2L17 8.5h3A1.5 1.5 0 0 1 21.5 10v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="3" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="m21 15.5-5-5L5 20.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4L11.5 5.6" />
      <path d="M14 10.5a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v5M12 17.5v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M14 9l3 3" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6Z" />,
  folder: <path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2.5h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  refresh: <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 4v5h-5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.7 3.3M6.3 7.8A17.5 17.5 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 3.7-.7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  send: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4Z" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </>
  ),
  bookmark: <path d="M6 3.5h12v18l-6-4.5-6 4.5Z" />,
  sparkles: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="M19 15.5 20 18l2.5 1-2.5 1-1 2.5-1-2.5L15.5 19l2.5-1Z" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4" />
    </>
  ),
  install: (
    <>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-5 4 5 4M5 12h11" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m3 3 18 18M8.5 15.5a5 5 0 0 1 6.5.4M5 12a12 12 0 0 1 4-2.5M19 12a12 12 0 0 0-3-2M2 8.5A16 16 0 0 1 6 6M22 8.5a16 16 0 0 0-6-2.5" />
      <path d="M12 20h.01" />
    </>
  ),
  flame: <path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.7.8-3.2 1.7-4.3.4 1.2 1.2 2 2.2 2.4C12 8 12 5.5 12 3Z" />,
  backspace: <path d="M20 5H9l-6 7 6 7h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 20 5Zm-3 4-5 6m0-6 5 6" />
};

export function Icon({ name, size = 20, filled = false, strokeWidth = 1.8, ...rest }: IconProps) {
  const isFilled = FILLED.includes(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={isFilled || filled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export function AppLogo({ size = 40 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} width={size} height={size} alt="" />;
}
