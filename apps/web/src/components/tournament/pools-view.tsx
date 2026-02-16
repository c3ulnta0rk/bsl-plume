"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PoolEntry {
  name: string;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  diff: number;
}

interface Pool {
  name: string;
  entries: PoolEntry[];
}

export interface CategoryPools {
  categoryType: string;
  pools: Pool[];
}

interface PoolsViewProps {
  categories: CategoryPools[];
}

export function PoolsView({ categories }: PoolsViewProps) {
  const t = useTranslations();

  const withPools = categories.filter((c) => c.pools.length > 0);

  if (withPools.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tournament.noTournaments")}
      </p>
    );
  }

  return <CategoryPoolsTabs categories={withPools} />;
}

function CategoryPoolsTabs({ categories }: { categories: CategoryPools[] }) {
  const t = useTranslations();
  const [active, setActive] = useState(categories[0]?.categoryType ?? "");

  const activeCat = categories.find((c) => c.categoryType === active);

  return (
    <div>
      {/* Category selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.categoryType}
            onClick={() => setActive(cat.categoryType)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active === cat.categoryType
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(`category.${cat.categoryType}`)}
          </button>
        ))}
      </div>

      {/* Pools for active category */}
      {activeCat && (
        <div className="space-y-6">
          {activeCat.pools.map((pool) => (
            <Card key={pool.name}>
              <CardHeader>
                <CardTitle>
                  {t("pool.title")} {pool.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">
                          {t("pool.ranking")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("pool.wins")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("pool.losses")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("pool.pointsFor")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("pool.pointsAgainst")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("pool.diff")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pool.entries.map((entry, index) => (
                        <tr
                          key={entry.name}
                          className="border-b last:border-0"
                        >
                          <td className="py-2">
                            <span className="mr-2 text-muted-foreground">
                              {index + 1}.
                            </span>
                            {entry.name}
                          </td>
                          <td className="py-2 text-center">{entry.wins}</td>
                          <td className="py-2 text-center">{entry.losses}</td>
                          <td className="py-2 text-center">{entry.pf}</td>
                          <td className="py-2 text-center">{entry.pa}</td>
                          <td className="py-2 text-center">
                            <span
                              className={
                                entry.diff > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : entry.diff < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : ""
                              }
                            >
                              {entry.diff > 0 ? "+" : ""}
                              {entry.diff}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
