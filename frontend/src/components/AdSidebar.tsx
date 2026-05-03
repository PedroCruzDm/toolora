import { useEffect } from "react";

function AdBlock({
  slot,
  height,
  className = "",
}: {
  slot: string;
  height: number;
  className?: string;
}) {
  return (
    <div className={`w-full bg-card rounded-3xl shadow-md border border-border overflow-hidden transition-all hover:shadow-xl ${className}`}>
      <div className="p-4 flex items-center justify-center">
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block", width: "100%", height: `${height}px`, minHeight: `${height}px` }}
          data-ad-client="ca-pub-4557264411230792"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-adtest="on"
        />
      </div>
    </div>
  );
}

export default function AdSidebar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Never load AdSense script during local development to avoid noisy console errors.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    const pushAds = () => {
      try {
        if ((window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
        }
      } catch (e) {
        // ignore push errors
      }
    };

    if ((window as any).adsbygoogle) {
      pushAds();
      pushAds();
      return;
    }

    const existing = document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', pushAds);
      existing.addEventListener('error', () => console.warn('AdSense script failed to load'));
      return;
    }

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4557264411230792';
    s.onload = () => {
      pushAds();
      pushAds();
    };
    s.onerror = (e) => console.warn('AdSense script failed to load', e);
    document.head.appendChild(s);
  }, []);

  // Use data-adtest="on" to render test ads locally (AdSense test mode)
  return (
    <div className="space-y-10 sticky top-24 lg:pr-0 xl:pr-2">
      {/* Anúncio horizontal superior */}
      <AdBlock slot="1234567890" height={90} />

      {/* Anúncio horizontal inferior */}
      <AdBlock slot="0987654321" height={250} />
    </div>
  );
}