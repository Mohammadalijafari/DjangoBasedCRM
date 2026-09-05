import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "../components/Drawer";
import { Button, ErrorText, Field, Input, Select } from "../components/ui";
import { companiesApi, contactsApi } from "../api/resources";
import { apiErrorMessage } from "../api/client";
import type { Contact } from "../types";
import styles from "../components/ui.module.css";

export function ContactDrawer({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!contact;

  const [firstName, setFirstName] = useState(contact?.first_name ?? "");
  const [lastName, setLastName] = useState(contact?.last_name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.job_title ?? "");
  const [companyId, setCompanyId] = useState(contact?.company ?? "");
  const [error, setError] = useState("");

  const { data: companies } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => companiesApi.list({ pageSize: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["contacts"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        job_title: jobTitle || null,
        company: companyId || null,
      };
      return isEdit ? contactsApi.update(contact.id, payload) : contactsApi.create(payload);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => contactsApi.remove(contact!.id),
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
    <Drawer title={isEdit ? contact.full_name : "New contact"} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Field label="First name">
          <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Job title">
          <Input value={jobTitle ?? ""} onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <Field label="Company">
          <Select value={companyId ?? ""} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">—</option>
            {companies?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
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
            {saveMutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create contact"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
