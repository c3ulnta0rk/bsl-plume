"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

export function AuthNav({
  action,
  locale,
  clubSlug,
}: {
  action: "logout";
  locale: string;
  clubSlug: string;
}) {
  const t = useTranslations("nav");
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push(`/${locale}/${clubSlug}`);
    router.refresh();
  }

  if (action === "logout") {
    return (
      <button
        onClick={handleLogout}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("logout")}
      </button>
    );
  }

  return null;
}
