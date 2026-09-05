import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "../components/Drawer";
import { Button, ErrorText, Field, Input } from "../components/ui";
import { companiesApi } from "../api/resources";
import { apiErrorMessage } from "../api/client";
import type { Company } from "../types";
import styles from "../components/ui.module.css";

export function CompanyDrawer({ company, onClose }: { company?: Company; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!company;

  const [name, setName] = useState(company?.name ?? "");
  const [domain, setDomain] = useState(company?.domain ?? "");
  const [industry, setIndustry] = useState(company?.industry ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["companies"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        domain: domain || null,
        industry: industry || null,
        phone: phone || null,
        website: website || null,
      };
      return isEdit ? companiesApi.update(company.id, payload) : companiesApi.create(payload);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => companiesApi.remove(company!.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    saveMutation.mutate();
  }

  return (
    <Drawer title={isEdit ? company.name : "New company"} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Domain">
          <Input value={domain ?? ""} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
        </Field>
        <Field label="Industry">
          <Input value={industry ?? ""} onChange={(e) => setIndustry(e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={website ?? ""} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className={styles.actions}>
          {isEdit && (
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create company"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
