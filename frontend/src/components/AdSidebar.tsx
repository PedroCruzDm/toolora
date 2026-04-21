export default function AdSidebar() {
  return (
    <div className="space-y-10 sticky top-24 lg:pr-0 xl:pr-2">
      {/* Anúncio horizontal */}
      <div className="w-full max-w-[728px] ml-auto bg-card rounded-3xl shadow-md border border-border overflow-hidden transition-all hover:shadow-xl">
        <div className="h-[250px] flex flex-col items-center justify-center bg-muted/50 text-muted-foreground text-base font-medium">
          <span className="mb-3 text-xl font-semibold">📣 Patrocinado</span>
          <span>728 × 250 (AdSense / Leaderboard)</span>
        </div>
      </div>

      {/* Anúncio vertical */}
      <div className="w-full max-w-[300px] ml-auto bg-card rounded-3xl shadow-md border border-border overflow-hidden hidden lg:block transition-all hover:shadow-xl">
        <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 text-muted-foreground text-base font-medium">
          <span className="mb-3 text-xl font-semibold">📣 Vertical</span>
          <span>300 × 600 (Half-Page)</span>
        </div>
      </div>
    </div>
  );
}