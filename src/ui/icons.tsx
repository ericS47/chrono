import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const make = (children: ReactNode, fill = false) =>
  function Icon({ size = 22, ...rest }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };

export const IconHome = make(<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" />);
export const IconCalendar = make(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const IconList = make(<path d="M4 6h16M4 12h16M4 18h10" />);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>);
export const IconPlay = make(<path d="M7 4l13 8-13 8z" />, true);
export const IconPause = make(<><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></>, true);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconSound = make(<><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6" /></>);
export const IconMute = make(<><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l4 6M21 9l-4 6" /></>);
export const IconArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconBack = make(<path d="M15 6l-6 6 6 6" />);
export const IconNext = make(<path d="M9 6l6 6-6 6" />);
export const IconPrev = make(<><path d="M19 6l-8 6 8 6z" /><path d="M6 6v12" /></>);
export const IconSkip = make(<><path d="M5 6l8 6-8 6z" /><path d="M18 6v12" /></>);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconStar = make(<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />);
export const IconStarFill = make(<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />, true);
export const IconEdit = make(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>);
export const IconCopy = make(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>);
export const IconTrash = make(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>);
export const IconShare = make(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>);
export const IconUp = make(<path d="M6 15l6-6 6 6" />);
export const IconDown = make(<path d="M6 9l6 6 6-6" />);
export const IconSearch = make(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>);
export const IconFlag = make(<><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>);
export const IconCheck = make(<path d="M5 12l5 5 9-10" />);
export const IconUser = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconExpand = make(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const IconHistory = make(<><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4" /><path d="M3 4v4h4M12 7v5l3 2" /></>);
