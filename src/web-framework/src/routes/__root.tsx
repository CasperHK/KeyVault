import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { ScrollTopButton } from "@/components/buttons/ScrollTopButton";
import { t, useLocale } from "@/lib/i18n";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  const locale = useLocale();
  const { pathname } = useLocation();
  useEffect(() => {
    const localized = ["/", "/login", "/dashboard"].includes(pathname);
    document.documentElement.lang = localized ? locale : "en";
    document.title = localized
      ? t("KeyVault - Your IT, in good hands.")
      : "KeyVault - Your IT, in good hands.";
  }, [locale, pathname]);
  return (
    <>
      <Outlet />
      <ScrollTopButton />
    </>
  );
}
