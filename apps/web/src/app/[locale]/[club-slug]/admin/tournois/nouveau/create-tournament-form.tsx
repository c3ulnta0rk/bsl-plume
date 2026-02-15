"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createTournamentAction } from "@/app/actions/tournament";

const CATEGORY_OPTIONS = ["SH", "SD", "DH", "DD", "DX"] as const;
const DEFAULT_MAX_PLAYERS: Record<string, number> = {
  SH: 32,
  SD: 32,
  DH: 16,
  DD: 16,
  DX: 16,
};

export function CreateTournamentForm({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await createTournamentAction(clubId, clubSlug, {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      location: (formData.get("location") as string) || null,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      registrationStart: formData.get("registrationStart") as string,
      registrationEnd: formData.get("registrationEnd") as string,
      courtCount: Number(formData.get("courtCount")) || 4,
      categories: selectedCategories.map((type) => ({
        type,
        maxPlayers: DEFAULT_MAX_PLAYERS[type] ?? 32,
      })),
    });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(`/${clubSlug}/admin/tournois/${result.data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tournament.create.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("tournament.fields.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Open de Rimouski 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("tournament.fields.description")}
            </Label>
            <Input
              id="description"
              name="description"
              placeholder="Description du tournoi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              {t("tournament.fields.location")}
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="Centre sportif de Rimouski"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                {t("tournament.fields.startDate")}
              </Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">
                {t("tournament.fields.endDate")}
              </Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationStart">
                {t("tournament.fields.registrationStart")}
              </Label>
              <Input
                id="registrationStart"
                name="registrationStart"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationEnd">
                {t("tournament.fields.registrationEnd")}
              </Label>
              <Input
                id="registrationEnd"
                name="registrationEnd"
                type="date"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courtCount">
              {t("tournament.fields.courtCount")}
            </Label>
            <Input
              id="courtCount"
              name="courtCount"
              type="number"
              min={1}
              max={50}
              defaultValue={4}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>{t("tournament.fields.categories")}</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    selectedCategories.includes(cat)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                  aria-pressed={selectedCategories.includes(cat)}
                >
                  {t(`category.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? t("common.loading")
              : t("tournament.create.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
