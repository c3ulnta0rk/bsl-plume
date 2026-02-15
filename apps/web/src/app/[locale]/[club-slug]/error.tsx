"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("error.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("error.description")}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Code: {error.digest}
            </p>
          )}
          <Button onClick={reset} className="w-full">
            {t("error.retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
