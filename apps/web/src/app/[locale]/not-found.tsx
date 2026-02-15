import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-xl">{t("error.notFound")}</p>
        <p className="mt-2 text-muted-foreground">
          {t("error.notFoundDescription")}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">{t("common.back")}</Link>
        </Button>
      </div>
    </div>
  );
}
