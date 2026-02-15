"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPlayerProfileAction } from "@/app/actions/player";

type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  club: string | null;
  licenseNumber: string | null;
};

export function PlayerProfileForm({
  clubSlug,
  existingProfile,
}: {
  clubSlug: string;
  existingProfile: PlayerProfile | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await upsertPlayerProfileAction(clubSlug, {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      birthDate: formData.get("birthDate") as string,
      club: (formData.get("club") as string) || null,
      licenseNumber: (formData.get("licenseNumber") as string) || null,
    });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingProfile
            ? t("player.editProfile")
            : t("player.createProfile")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("player.firstName")}</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={existingProfile?.firstName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("player.lastName")}</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                defaultValue={existingProfile?.lastName ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">{t("player.birthDate")}</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={existingProfile?.birthDate ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="club">{t("player.club")}</Label>
            <Input
              id="club"
              name="club"
              defaultValue={existingProfile?.club ?? ""}
              placeholder="BSL Badminton"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">
              {t("player.licenseNumber")}
            </Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              defaultValue={existingProfile?.licenseNumber ?? ""}
              placeholder="QC-123456"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("player.profileSaved")}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("player.saveProfile")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
