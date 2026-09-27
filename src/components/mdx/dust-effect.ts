export function animateDust(
  content: HTMLElement,
  { duration, tile = 1, layers = 32, delay = 0, restore = false }: {
    duration: number;
    tile?: number;
    layers?: number;
    delay?: number;
    restore?: boolean;
  },
) {
  const parent = content.parentElement;
  const width = Math.ceil(content.offsetWidth);
  const height = Math.ceil(content.offsetHeight);
  if (!parent || !width || !height) return { animations: [] as Animation[], copies: [] as HTMLElement[] };

  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.ceil(width * scale);
  const pixelHeight = Math.ceil(height * scale);
  const masks = Array.from({ length: layers }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    return canvas;
  });
  const contexts = masks.map((mask) => mask.getContext("2d"));
  for (const context of contexts) if (context) context.fillStyle = "white";

  for (let y = 0; y < pixelHeight; y += tile) {
    for (let x = 0; x < pixelWidth; x += tile) {
      const index = Math.max(0, Math.min(layers - 1,
        Math.floor(layers * (0.1 + 0.8 * x / pixelWidth) + (Math.random() - 0.5) * layers / 6),
      ));
      contexts[index]?.fillRect(x, y, tile, tile);
    }
  }

  const copies: HTMLElement[] = [];
  const animations: Animation[] = [];
  masks.forEach((mask, index) => {
    const copy = content.cloneNode(true) as HTMLElement;
    const url = `url(${mask.toDataURL()})`;
    copy.dataset.dustLayer = "";
    copy.removeAttribute("data-snap-target");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a, button, input").forEach((element) => element.setAttribute("tabindex", "-1"));
    Object.assign(copy.style, {
      position: "absolute",
      inset: "0",
      width: `${width}px`,
      height: `${height}px`,
      visibility: "visible",
      pointerEvents: "none",
      maskImage: url,
      maskSize: `${width}px ${height}px`,
    });
    copy.style.setProperty("-webkit-mask-image", url);
    copy.style.setProperty("-webkit-mask-size", `${width}px ${height}px`);
    parent.appendChild(copy);

    const angle = (Math.random() - 0.5) * Math.PI * 2;
    const distance = 50 + Math.random() * 40;
    const scattered = {
      opacity: 0,
      transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${(Math.random() - 0.5) * 15}deg)`,
    };
    const whole = { opacity: 1, transform: "translate(0, 0) rotate(0deg)" };
    animations.push(copy.animate(restore ? [scattered, whole] : [whole, scattered], {
      duration: 1_100,
      delay: delay + index / layers * duration,
      easing: "ease-out",
      fill: "both",
    }));
    copies.push(copy);
  });
  return { animations, copies };
}
