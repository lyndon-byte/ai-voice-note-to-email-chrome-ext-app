

export const IconMic = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="9" y="2" width="6" height="13" rx="3" fill="currentColor"/>
    <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconStop = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="4" y="4" width="12" height="12" rx="1" fill="currentColor"/>
  </svg>
)

export const IconPlay = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <polygon points="5,3 17,10 5,17" fill="currentColor"/>
  </svg>
)

export const IconPause = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="4" y="3" width="4" height="14" rx="1" fill="currentColor"/>
    <rect x="12" y="3" width="4" height="14" rx="1" fill="currentColor"/>
  </svg>
)

export const IconRewind5 = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
    <path d="M4 11a7 7 0 1 0 7-7V2L7 5l4 3V6a5 5 0 1 1-5 5H4z" fill="currentColor"/>
    <text x="11" y="13.5" textAnchor="middle" fontSize="5.5" fill="currentColor" fontWeight="700">5</text>
  </svg>
)

export const IconFwd5 = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
    <path d="M18 11a7 7 0 1 1-7-7V2l4 3-4 3V6a5 5 0 1 0 5 5h2z" fill="currentColor"/>
    <text x="11" y="13.5" textAnchor="middle" fontSize="5.5" fill="currentColor" fontWeight="700">5</text>
  </svg>
)

export const IconSkipBack = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <polygon points="16,3 6,10 16,17" fill="currentColor"/>
    <rect x="3" y="3" width="2.5" height="14" rx="1" fill="currentColor"/>
  </svg>
)

export const IconSkipFwd = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <polygon points="4,3 14,10 4,17" fill="currentColor"/>
    <rect x="14.5" y="3" width="2.5" height="14" rx="1" fill="currentColor"/>
  </svg>
)

export const IconDownload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M4 15h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

export const IconChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconTrash = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.7 7.5a.5.5 0 00.5.5h5.6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconRefresh = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M12 2v3.5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7a5 5 0 018.5-3.5L12 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M2 12v-3.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 7a5 5 0 01-8.5 3.5L2 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

export const IconEdit = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
)

export const IconInsert = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

export const IconCopy = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconDrag = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
    <circle cx="2" cy="2" r="1" fill="currentColor"/>
    <circle cx="6" cy="2" r="1" fill="currentColor"/>
    <circle cx="2" cy="6" r="1" fill="currentColor"/>
    <circle cx="6" cy="6" r="1" fill="currentColor"/>
    <circle cx="2" cy="10" r="1" fill="currentColor"/>
    <circle cx="6" cy="10" r="1" fill="currentColor"/>
  </svg>
)
