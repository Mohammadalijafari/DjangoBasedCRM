import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./ListPage.module.css";
import { PageHeader } from "../components/AppShell";
import { Button, Input } from "../components/ui";
import { contactsApi } from "../api/resources";
import type { Contact } from "../types";
import { ContactDrawer } from "./ContactDrawer";

export function Contacts() {
  const [search, setSearch] = useState("");
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState<Contact | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search, pageUrl],
    queryFn: () => contactsApi.list({ search: search || undefined, url: pageUrl }),
  });

  function handleSearch(value: string) {
    setSearch(value);
    setPageUrl(undefined);
  }

  const contacts = data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={data ? `${data.count} on file` : undefined}
        action={<Button onClick={() => setOpen("new")}>New contact</Button>}
      />
      <div className={styles.wrap}>
        <div className={styles.searchRow}>
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {isLoading && <p>Loading…</p>}

        {!isLoading && contacts.length === 0 && (
          <div className={styles.emptyState}>No contacts yet. Add your first one.</div>
        )}

        {!isLoading && contacts.length > 0 && (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} onClick={() => setOpen(c)}>
                    <td className={styles.primaryCell}>{c.full_name}</td>
                    <td className={styles.secondaryText}>{c.job_title ?? "—"}</td>
                    <td className={styles.secondaryText}>{c.email ?? "—"}</td>
                    <td className={styles.secondaryText}>{c.phone ?? "—"}</td>
                    <td>
                      {c.tags.map((t) => (
                        <span key={t} className={styles.tag}>
                          {t}
                        </span>
                      ))}
                    </td>
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

      {open === "new" && <ContactDrawer onClose={() => setOpen(null)} />}
      {open && open !== "new" && <ContactDrawer contact={open} onClose={() => setOpen(null)} />}
    </>
  );
}
