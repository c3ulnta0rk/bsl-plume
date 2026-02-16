import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getClubBySlug, getClubMembership } from "@bsl-plume/db/queries";
import { AuthNav } from "./auth-nav";
import { RealtimeProviderWrapper } from "@/providers/realtime-provider";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const user = await getSession();
  const club = await getClubBySlug(db, clubSlug);

  let isAdmin = false;
  if (user && club) {
    const membership = await getClubMembership(db, user.id, club.id);
    isAdmin = membership?.role === "admin";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ClubHeader
        clubSlug={clubSlug}
        clubName={club?.name ?? clubSlug}
        locale={locale}
        isLoggedIn={user !== null}
        isAdmin={isAdmin}
        userName={(user?.user_metadata?.name as string) ?? null}
      />
      <RealtimeProviderWrapper>
        <main className="flex-1">{children}</main>
      </RealtimeProviderWrapper>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          BSL Plume — {club?.name ?? clubSlug}
        </div>
      </footer>
    </div>
  );
}

function ClubHeader({
  clubSlug,
  clubName,
  locale,
  isLoggedIn,
  isAdmin,
  userName,
}: {
  clubSlug: string;
  clubName: string;
  locale: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  userName: string | null;
}) {
  const t = useTranslations("nav");

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={`/${locale}/${clubSlug}`} className="text-xl font-bold">
            BSL Plume
          </Link>
          <span className="text-sm text-muted-foreground">
            {clubName}
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href={`/${locale}/${clubSlug}/tournois`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("tournaments")}
          </Link>

          {isAdmin && (
            <Link
              href={`/${locale}/${clubSlug}/admin`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("admin")}
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <Link
                href={`/${locale}/${clubSlug}/profil`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {userName ?? t("profile")}
              </Link>
              <AuthNav action="logout" locale={locale} clubSlug={clubSlug} />
            </>
          ) : (
            <Link
              href={`/${locale}/auth/connexion`}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              {t("login")}
            </Link>
          )}

          <LocaleSwitcher locale={locale} clubSlug={clubSlug} />
        </nav>
      </div>
    </header>
  );
}

function LocaleSwitcher({
  locale,
  clubSlug,
}: {
  locale: string;
  clubSlug: string;
}) {
  const otherLocale = locale === "fr" ? "en" : "fr";
  const label = locale === "fr" ? "EN" : "FR";

  return (
    <Link
      href={`/${otherLocale}/${clubSlug}`}
      className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
    >
      {label}
    </Link>
  );
}
