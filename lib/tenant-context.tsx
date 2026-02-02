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
    favicon: string;
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

    if(primaryHSL) root.style.setProperty("--primary", `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    if(accentHSL) root.style.setProperty("--accent", `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);

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

        document.title = `${tenant.name} | Training Portal`;
    }
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        h: parseInt(result[1], 16),
        s: parseInt(result[2], 16),
        l: parseInt(result[3], 16)
    } : null;
}