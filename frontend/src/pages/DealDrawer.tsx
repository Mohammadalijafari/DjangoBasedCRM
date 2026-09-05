import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "../components/Drawer";
import { Button, ErrorText, Field, Input, Select } from "../components/ui";
import { companiesApi, contactsApi, dealsApi } from "../api/resources";
import { apiErrorMessage } from "../api/client";
import type { Deal, Pipeline } from "../types";
import styles from "../components/ui.module.css";

interface Props {
  pipeline: Pipeline;
  defaultStageId: string;
  deal?: Deal;
  onClose: () => void;
}

export function DealDrawer({ pipeline, defaultStageId, deal, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!deal;

  const [title, setTitle] = useState(deal?.title ?? "");
  const [amount, setAmount] = useState(deal?.amount ?? "0");
  const [stageId, setStageId] = useState(deal?.stage ?? defaultStageId);
  const [companyId, setCompanyId] = useState(deal?.company ?? "");
  const [contactId, setContactId] = useState(deal?.primary_contact ?? "");
  const [expectedClose, setExpectedClose] = useState(deal?.expected_close_date ?? "");
  const [error, setError] = useState("");

  const { data: companies } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => companiesApi.list({ pageSize: 200 }),
  });
  const { data: contacts } = useQuery({
    queryKey: ["contacts", "all"],
    queryFn: () => contactsApi.list({ pageSize: 200 }),
  });

  const invalidateDeals = () => queryClient.invalidateQueries({ queryKey: ["deals"] });

  const createMutation = useMutation({
    mutationFn: () =>
      dealsApi.create({
        title,
        amount,
        pipeline: pipeline.id,
        stage: stageId,
        company: companyId || undefined,
        primary_contact: contactId || undefined,
        expected_close_date: expectedClose || undefined,
      }),
    onSuccess: () => {
      invalidateDeals();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      dealsApi.update(deal!.id, {
        title,
        amount,
        expected_close_date: expectedClose || null,
      }),
    onSuccess: () => {
      invalidateDeals();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => dealsApi.remove(deal!.id),
    onSuccess: () => {
      invalidateDeals();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const closed = deal?.is_closed;

  return (
    <Drawer title={isEdit ? deal.title : "New deal"} onClose={onClose}>
      {closed && (
        <p className={styles.errorText} style={{ color: "var(--brass)" }}>
          This deal is closed and can no longer be edited.
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Field label="Title">
          <Input required value={title} disabled={closed} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            disabled={closed}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {!isEdit && (
          <Field label="Stage">
            <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {pipeline.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!isEdit && (
          <Field label="Company (optional)">
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">—</option>
              {companies?.results.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!isEdit && (
          <Field label="Primary contact (optional)">
            <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">—</option>
              {contacts?.results.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Expected close date">
          <Input
            type="date"
            value={expectedClose ?? ""}
            disabled={closed}
            onChange={(e) => setExpectedClose(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className={styles.actions}>
          {isEdit && !closed && (
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
          {!closed && (
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create deal"}
            </Button>
          )}
        </div>
      </form>
    </Drawer>
  );
}
