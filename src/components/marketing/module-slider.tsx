"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./site.module.css";

export type HeroSlide = { id: string; tab: string; title: string; text: string; visual: ReactNode; actions: ReactNode };

const INTERVAL_MS = 8000;

/** Full-width visuals under the header; tabs and the active slide's caption sit below in the page container. */
export function ModuleSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Once the visitor picks a slide, the carousel stops rotating on its own.
  const [stopped, setStopped] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const running = !stopped && !reducedMotion && slides.length > 1;
  const paused = hovered || focused;

  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, running, paused, slides.length]);

  const go = (index: number) => {
    setStopped(true);
    setActive(index);
  };

  return (
    <section
      className={styles.slider}
      aria-roledescription="carousel"
      aria-label="Flodeska modülleri"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    >
      <div className={styles.slides} aria-live={running ? "off" : "polite"}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={index === active ? styles.slideActive : styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${slides.length}: ${slide.tab}`}
            aria-hidden={index !== active}
            inert={index !== active}
          >
            <div className={styles.slideVisual}>{slide.visual}</div>
          </div>
        ))}
      </div>
      <div className="container">
        <div className={styles.sliderTabs}>
          {slides.map((slide, index) => (
            <button key={slide.id} type="button" className={index === active ? styles.sliderTabActive : styles.sliderTab} aria-current={index === active} onClick={() => go(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{slide.tab}
              {index === active && running && !paused ? <i key={`${slide.id}-${active}`} className={styles.sliderProgress} style={{ animationDuration: `${INTERVAL_MS}ms` }} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        <div className={styles.slideCaption}>
          <div>
            <h2>{slides[active].title}</h2>
            <p>{slides[active].text}</p>
          </div>
          {slides[active].actions}
        </div>
      </div>
    </section>
  );
}
