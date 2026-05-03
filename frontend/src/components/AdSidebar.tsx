import { useEffect } from "react";

export default function AdSidebar() {
  useEffect(() => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        // push any ins.adsbygoogle instances
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (window as any).adsbygoogle.push({});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Use data-adtest="on" to render test ads locally (AdSense test mode)
  return (
    <div className="space-y-10 sticky top-24 lg:pr-0 xl:pr-2">
      {/* Anúncio horizontal (Leaderboard) */}
      <div className="w-full max-w-[728px] ml-auto bg-card rounded-3xl shadow-md border border-border overflow-hidden transition-all hover:shadow-xl">
        <div className="p-4 flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '728px', height: '90px' }}
            data-ad-client="ca-pub-4557264411230792"
            data-ad-slot="1234567890"
            data-ad-format="auto"
            data-full-width-responsive="false"
            data-adtest="on"
          />
        </div>
      </div>

      {/* Anúncio vertical (Half-Page) */}
      <div className="w-full max-w-[300px] ml-auto bg-card rounded-3xl shadow-md border border-border overflow-hidden hidden lg:block transition-all hover:shadow-xl">
        <div className="p-4 flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '300px', height: '600px' }}
            data-ad-client="ca-pub-4557264411230792"
            data-ad-slot="0987654321"
            data-ad-format="auto"
            data-full-width-responsive="false"
            data-adtest="on"
          />
        </div>
      </div>
    </div>
  );
}