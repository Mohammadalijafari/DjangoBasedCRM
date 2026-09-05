import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./ListPage.module.css";
import { PageHeader } from "../components/AppShell";
import { Button, Input } from "../components/ui";
import { companiesApi } from "../api/resources";
import type { Company } from "../types";
import { CompanyDrawer } from "./CompanyDrawer";

export function Companies() {
  const [search, setSearch] = useState("");
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState<Company | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search, pageUrl],
    queryFn: () => companiesApi.list({ search: search || undefined, url: pageUrl }),
  });

  function handleSearch(value: string) {
    setSearch(value);
    setPageUrl(undefined);
  }

  const companies = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle={data ? `${data.count} on file` : undefined}
        action={<Button onClick={() => setOpen("new")}>New company</Button>}
      />
      <div className={styles.wrap}>
        <div className={styles.searchRow}>
          <Input
            placeholder="Search name, domain, industry…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {isLoading && <p>Loading…</p>}

        {!isLoading && companies.length === 0 && (
          <div className={styles.emptyState}>No companies yet. Add your first one.</div>
        )}

        {!isLoading && companies.length > 0 && (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Domain</th>
                  <th>Industry</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} onClick={() => setOpen(c)}>
                    <td className={styles.primaryCell}>{c.name}</td>
                    <td className={styles.secondaryText}>{c.domain ?? "—"}</td>
                    <td className={styles.secondaryText}>{c.industry ?? "—"}</td>
                    <td className={styles.secondaryText}>{c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.paginationRow}>
              <span>{data?.count} total</span>
              <div className={styles.paginationButtons}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!data?.previous}
                  onClick={() => setPageUrl(data?.previous ?? undefined)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!data?.next}
                  onClick={() => setPageUrl(data?.next ?? undefined)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {open === "new" && <CompanyDrawer onClose={() => setOpen(null)} />}
      {open && open !== "new" && <CompanyDrawer company={open} onClose={() => setOpen(null)} />}
    </>
  );
}
