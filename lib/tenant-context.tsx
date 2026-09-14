"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { isPathBlocked, type TenantFeature } from "@lib/tenant-features"

export interface TenantBranding {
    id: string;
    name: string;
    slug: string;
    subdomain: string;
    primaryColour: string;
    accentColour: string;
    loginBackground: string | null;
    logo: string | null;
    favicon: string | null;
    welcomeMessage: string | null;
    footerText: string | null;
    hideBranding: boolean;
    disabledFeatures?: string[];
}

interface TenantContextType {
    tenant: TenantBranding | null;
    isWhitelabeled: boolean;
    isLoading: boolean;
    disabledFeatures: string[];
    /** False when the school switched this off, or it is AviPrep-only. */
    isFeatureEnabled: (feature: TenantFeature) => boolean;
    /** True when a route must not render for this tenant. */
    isBlocked: (pathname: string) => boolean;
}

const TenantContext = createContext<TenantContextType>({
    tenant: null,
    isWhitelabeled: false,
    isLoading: true,
    disabledFeatures: [],
    isFeatureEnabled: () => true,
    isBlocked: () => false,
});

export function useTenant() {
    return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const [tenant, setTenant] = useState<TenantBranding | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTenant() {
            try {
                const res = await fetch("/api/tenant");
                if(res.ok) {
                    const data = await res.json();
                    if(data.tenant) {
                        setTenant(data.tenant);
                        applyBrandingStyles(data.tenant);
                    }
                }
            } catch(e) {
                console.error(`Failed to fetch tenant: ${e}`);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTenant();
    }, []);

    const value = useMemo<TenantContextType>(() => {
        const disabledFeatures = tenant?.disabledFeatures ?? [];
        const isTenant = !!tenant;

        return {
            tenant,
            isWhitelabeled: isTenant,
            isLoading,
            disabledFeatures,
            isFeatureEnabled: (feature) => !isTenant || !disabledFeatures.includes(feature),
            isBlocked: (pathname) => isPathBlocked({ pathname, isTenant, disabledFeatures }),
        };
    }, [tenant, isLoading]);

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

function applyBrandingStyles(tenant: TenantBranding) {
    const root = document.documentElement;

    const primaryHSL = hexToHSL(tenant.primaryColour);
    const accentHSL = hexToHSL(tenant.accentColour);

    if(primaryHSL) root.style.setProperty("--primary", `hsl(${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%)`);
    if(accentHSL) root.style.setProperty("--accent", `hsl(${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%)`);

    // The default foregrounds are tuned for AviPrep's light orange. A school
    // brand can be any lightness, so pick the readable one per colour instead
    // of leaving dark text on a dark button.
    const primaryFg = readableForeground(tenant.primaryColour);
    const accentFg = readableForeground(tenant.accentColour);
    if(primaryFg) root.style.setProperty("--primary-foreground", primaryFg);
    if(accentFg) root.style.setProperty("--accent-foreground", accentFg);
    if(primaryFg) root.style.setProperty("--sidebar-primary-foreground", primaryFg);

    if(tenant.name) {
        document.title = `${tenant.name} | Training Portal`;
    }
    
    if(tenant.favicon) {
        const existingFavicon = document.querySelector('link[rel="icon"]');
        if(existingFavicon) {
            existingFavicon.setAttribute("href", tenant.favicon);
        } else {
            const link = document.createElement("link");
            link.rel = "icon";
            link.href = tenant.favicon;
            document.head.appendChild(link);
        }
    }
}

/**
 * Black or white, whichever has more contrast against the brand colour.
 * Uses WCAG relative luminance, so the choice matches how the ratio is judged.
 */
function readableForeground(hex: string): string | null {
    const clean = (hex || "").replace(/^#/, "");
    if(clean.length !== 6) return null;

    const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = channel(parseInt(clean.substring(0, 2), 16));
    const g = channel(parseInt(clean.substring(2, 4), 16));
    const b = channel(parseInt(clean.substring(4, 6), 16));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const onWhite = 1.05 / (luminance + 0.05);
    const onBlack = (luminance + 0.05) / 0.05;

    return onBlack >= onWhite ? "oklch(0.15 0.01 250)" : "oklch(0.99 0 0)";
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, "")

  if (hex.length !== 6) return null

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}
