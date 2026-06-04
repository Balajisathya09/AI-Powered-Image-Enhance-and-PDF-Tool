"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t border-border mt-auto relative z-10">
      <p>{t.footer.copyright}</p>
    </footer>
  );
}
