"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  registerForCategoryAction,
  withdrawRegistrationAction,
} from "@/app/actions/registration";

export function RegisterButton({
  categoryId,
  clubSlug,
  isRegistered,
  registrationId,
  isOpen,
  isFull,
}: {
  categoryId: string;
  clubSlug: string;
  isRegistered: boolean;
  registrationId: string | null;
  isOpen: boolean;
  isFull: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setIsLoading(true);
    setError(null);

    const result = await registerForCategoryAction(categoryId, clubSlug);

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.refresh();
    setIsLoading(false);
  }

  async function handleWithdraw() {
    if (!registrationId) return;
    setIsLoading(true);
    setError(null);

    const result = await withdrawRegistrationAction(registrationId, clubSlug);

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.refresh();
    setIsLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="mt-3">
      {isRegistered ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleWithdraw}
          disabled={isLoading}
        >
          {isLoading ? t("common.loading") : t("common.cancel")}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleRegister}
          disabled={isLoading || isFull}
        >
          {isLoading
            ? t("common.loading")
            : isFull
              ? t("registration.categoryFull")
              : t("registration.submit")}
        </Button>
      )}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
