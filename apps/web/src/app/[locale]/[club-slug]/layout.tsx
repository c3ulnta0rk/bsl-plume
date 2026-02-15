import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <ClubHeader clubSlug={clubSlug} />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          BSL Plume - {clubSlug}
        </div>
      </footer>
    </div>
  );
}

function ClubHeader({ clubSlug }: { clubSlug: string }) {
  const t = useTranslations("nav");

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            BSL Plume
          </Link>
          <span className="text-sm text-muted-foreground capitalize">
            {clubSlug}
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href={`/${clubSlug}/tournois`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("tournaments")}
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            {t("login")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
