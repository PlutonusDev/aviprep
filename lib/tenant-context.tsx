"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export interface TenantBranding {
    id: string;
    name: string;
    slug: string;
    primaryColour: string;
    accentColour: string;
    loginBackground: string | null;
    logo: string | null;
    favicon: string | null;
    welcomeMessage: string | null;
    footerText: string | null;
    hideBranding: boolean;
}

interface TenantContextType {
    tenant: TenantBranding | null;
    isWhitelabeled: boolean;
    isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
    tenant: null,
    isWhitelabeled: false,
    isLoading: true
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

    return (
        <TenantContext.Provider value={{ tenant, isWhitelabeled: !!tenant, isLoading }}>
            {children}
        </TenantContext.Provider>
    );
}

function applyBrandingStyles(tenant: TenantBranding) {
    const root = document.documentElement;

    const primaryHSL = hexToHSL(tenant.primaryColour);
    const accentHSL = hexToHSL(tenant.accentColour);

    if(primaryHSL) root.style.setProperty("--primary", `hsl(${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%)`);
    if(accentHSL) root.style.setProperty("--accent", `hsl(${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%)`);

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
