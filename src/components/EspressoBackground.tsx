import videoAsset from "@/assets/espresso-loop.mp4.asset.json";

// Full-screen looping macro espresso video, fixed behind all content.
// Autoplays muted+inline so it works on iOS/Safari without user gesture.
// GPU-accelerated with will-change-transform for smooth 60/120 FPS.
export function EspressoBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      <video
        src={videoAsset.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={(e) => {
          console.warn('Video failed to load, using fallback background');
          (e.target as HTMLVideoElement).style.display = 'none';
        }}
        className="absolute inset-0 h-full w-full scale-110 object-cover will-change-transform transform-gpu"
        style={{ 
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as const,
          perspective: 1000
        }}
      />
      {/* Warm tone + softer vignette + lighter readability scrim */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.25)_75%,rgba(0,0,0,0.55)_100%)] will-change-transform" />
      <div className="absolute inset-0 bg-black/15 will-change-transform" />
      <div className="absolute inset-0 mix-blend-overlay bg-[linear-gradient(180deg,rgba(90,55,25,0.22),rgba(40,20,10,0.30))] will-change-transform" />
    </div>
  );
}
