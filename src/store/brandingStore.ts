import { create } from 'zustand';

interface BrandingState {
  logoUrl: string;
  adminLogoUrl: string;
  faviconUrl: string;
  siteName: string;
  loading: boolean;
  fetchBranding: () => Promise<void>;
  updateBranding: (data: { logo_url: string; admin_logo_url: string; favicon_url: string; site_name: string }) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  logoUrl: '',
  adminLogoUrl: '',
  faviconUrl: '',
  siteName: 'DigiSeller',
  loading: true,
  fetchBranding: async () => {
    try {
      const res = await fetch('/api/public/branding');
      const data = await res.json();
      set({ 
        logoUrl: data.logo_url || '', 
        adminLogoUrl: data.admin_logo_url || '',
        faviconUrl: data.favicon_url || '', 
        siteName: data.site_name || 'DigiSeller',
        loading: false 
      });
      
      // Update Title & Favicon
      if (data.site_name) document.title = data.site_name;
      if (data.favicon_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = data.favicon_url;
      }
    } catch (err) {
      set({ loading: false });
    }
  },
  updateBranding: (data) => {
    set({ 
      logoUrl: data.logo_url, 
      adminLogoUrl: data.admin_logo_url,
      faviconUrl: data.favicon_url, 
      siteName: data.site_name 
    });
    if (data.site_name) document.title = data.site_name;
  }
}));
