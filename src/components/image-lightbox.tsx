import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Global lightbox: any <img data-zoom> opens fullscreen; images sharing data-zoom-group become a gallery. */
export function ImageLightbox() {
  const [imgs, setImgs] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const open = imgs.length > 0;
  const close = useCallback(() => setImgs([]), []);
  const next = useCallback(() => setI((v) => (v + 1) % imgs.length), [imgs.length]);
  const prev = useCallback(() => setI((v) => (v - 1 + imgs.length) % imgs.length), [imgs.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("img[data-zoom]") as HTMLImageElement | null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const group = el.dataset["zoomGroup"];
      const list = group
        ? Array.from(document.querySelectorAll<HTMLImageElement>(`img[data-zoom][data-zoom-group="${group}"]`))
        : [el];
      const srcs = list.map((x) => x.currentSrc || x.src);
      setImgs(srcs);
      setI(Math.max(0, list.indexOf(el)));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = o;
    };
  }, [open, close, next, prev]);

  if (!open) return null;
  const many = imgs.length > 1;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/95 p-4" onClick={close} role="dialog" aria-modal="true">
      <img src={imgs[i]} alt="" className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
      <button aria-label="Close" onClick={close} className="absolute right-4 top-4 rounded-full bg-background/20 p-2 text-background hover:bg-background/30">
        <X className="h-6 w-6" />
      </button>
      {many && (
        <>
          <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/20 p-2 text-background hover:bg-background/30">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button aria-label="Next" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/20 p-2 text-background hover:bg-background/30">
            <ChevronRight className="h-7 w-7" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/20 px-3 py-1 text-sm text-background">{i + 1} / {imgs.length}</div>
        </>
      )}
    </div>
  );
}
