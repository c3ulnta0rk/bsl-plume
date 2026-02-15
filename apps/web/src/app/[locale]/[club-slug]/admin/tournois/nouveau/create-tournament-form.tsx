"use client";

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
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const CATEGORY_OPTIONS = ["SH", "SD", "DH", "DD", "DX"] as const;

export function CreateTournamentForm() {
  const t = useTranslations();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tournament.create.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
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

          <Button type="submit" className="w-full">
            {t("tournament.create.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
