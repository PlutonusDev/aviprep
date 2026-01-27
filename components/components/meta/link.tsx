"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import React, { ReactNode } from "react";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  href: string;
  className?: string;
}

export default ({
  children,
  href,
  className,
  ...props
}: TransitionLinkProps) => {
  const router = useRouter();

  const handleTransition = async (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    
    const event = new CustomEvent("trigger-transition-start", { detail: { href } });
    window.dispatchEvent(event);

    setTimeout(() => {
      router.push(href);
      router.refresh();
    }, 2500); 
  };

  return (
    <Link
      {...props}
      href={href}
      onClick={e => {
        window.history.replaceState({ ...window.history.state }, "", href);
        handleTransition(e);
      }}
      className={className}
    >
      {children}
    </Link>
  );
};