"use client";

import Link, { LinkProps } from "next/link";
import React, { ReactNode } from "react";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  href: string;
  className?: string;
}

/**
 * Previously this intercepted every click, dispatched a transition event and
 * delayed router.push by 2.5s behind a full-screen overlay. That overlay is
 * gone, so this is now a plain next/link: navigation is immediate, modifier
 * clicks (new tab / new window) work again, and history is not rewritten.
 *
 * Kept as a wrapper so the ~20 existing call sites need no change; new code can
 * import next/link directly.
 */
export default ({ children, href, className, ...props }: TransitionLinkProps) => {
  return (
    <Link {...props} href={href} className={className}>
      {children}
    </Link>
  );
};
