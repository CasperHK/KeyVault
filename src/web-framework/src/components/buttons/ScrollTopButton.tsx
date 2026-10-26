import { t, useLocale } from "@/lib/i18n";
import { useLocation } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import "./ScrollTopButton.css";

const circumference = 2 * Math.PI * 23;

export function ScrollTopButton() {
  useLocale();

  const { pathname } = useLocation();
  const [scroll, setScroll] = useState({ visible: false, progress: 0 });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      setScroll({
        visible: window.scrollY > 300 && distance > 0,
        progress: distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0,
      });
    };
    const scheduleUpdate = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        update();
      } else if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("visibilitychange", scheduleUpdate);
    update();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("visibilitychange", scheduleUpdate);
    };
  }, []);

  return (
    <button
      type="button"
      className="kv-scroll-top"
      data-visible={scroll.visible}
      data-admin={pathname.startsWith("/admin")}
      aria-label={t("Scroll to top")}
      aria-hidden={!scroll.visible}
      tabIndex={scroll.visible ? 0 : -1}
      title={t("Back to top")}
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }}
    >
      <svg className="kv-scroll-top-ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="kv-scroll-top-track" cx="26" cy="26" r="23" />
        <circle
          className="kv-scroll-top-progress"
          cx="26"
          cy="26"
          r="23"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - scroll.progress)}
        />
      </svg>
      <ArrowUp size={21} strokeWidth={2} aria-hidden="true" />
      <span className="kv-scroll-top-label" aria-hidden="true">
        {t("Back to top")}
      </span>
    </button>
  );
}
