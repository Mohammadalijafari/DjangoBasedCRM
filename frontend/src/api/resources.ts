import { api } from "./client";
import type { Company, Contact, Deal, Paginated, Pipeline, StageSummary } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string }>("/auth/login", { email, password }),
};

export const dealsApi = {
  // DealViewSet's list() is hand-written and intentionally unpaginated: a
  // kanban board needs the full set of deals for the pipeline, not a page.
  list: (params?: Record<string, string>) =>
    api.get<Deal[]>("/deals/", { params }).then((r) => r.data),
  get: (id: string) => api.get<Deal>(`/deals/${id}/`).then((r) => r.data),
  create: (payload: Partial<Deal> & { title: string; pipeline: string; stage: string }) =>
    api.post<Deal>("/deals/", payload).then((r) => r.data),
  update: (id: string, payload: Partial<Deal>) =>
    api.patch<Deal>(`/deals/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/deals/${id}/`),
  moveStage: (id: string, stage_id: string) =>
    api.post<Deal>(`/deals/${id}/move-stage/`, { stage_id }).then((r) => r.data),
  pipelineBoard: (pipelineId: string) =>
    api.get<StageSummary[]>(`/deals/pipeline/${pipelineId}/board/`).then((r) => r.data),
};

interface ListParams {
  search?: string;
  /** Absolute "next"/"previous" URL from a prior paginated response. */
  url?: string;
  /** Request a larger page for populating dropdowns with the full set. */
  pageSize?: number;
}

export const contactsApi = {
  list: (params?: ListParams) => {
    if (params?.url) return api.get<Paginated<Contact>>(params.url).then((r) => r.data);
    return api
      .get<Paginated<Contact>>("/contacts/", {
        params: {
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.pageSize ? { page_size: params.pageSize } : {}),
        },
      })
      .then((r) => r.data);
  },
  create: (payload: Partial<Contact> & { first_name: string; last_name: string }) =>
    api.post<Contact>("/contacts/", payload).then((r) => r.data),
  update: (id: string, payload: Partial<Contact>) =>
    api.patch<Contact>(`/contacts/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/contacts/${id}/`),
};

export const companiesApi = {
  list: (params?: ListParams) => {
    if (params?.url) return api.get<Paginated<Company>>(params.url).then((r) => r.data);
    return api
      .get<Paginated<Company>>("/companies/", {
        params: {
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.pageSize ? { page_size: params.pageSize } : {}),
        },
      })
      .then((r) => r.data);
  },
  create: (payload: Partial<Company> & { name: string }) =>
    api.post<Company>("/companies/", payload).then((r) => r.data),
  update: (id: string, payload: Partial<Company>) =>
    api.patch<Company>(`/companies/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/companies/${id}/`),
};

export const pipelinesApi = {
  // Unpaginated on the backend (pagination_class = None) — pipelines are
  // small, bounded reference data; the frontend always wants the full set.
  list: () => api.get<Pipeline[]>("/pipelines/").then((r) => r.data),
};
