export interface Stage {
  id: string;
  name: string;
  order: number;
  win_probability: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages: Stage[];
}

export interface StageSummary {
  id: string;
  name: string;
  order: number;
  deal_count: number;
  total_amount: string;
}

export interface Deal {
  id: string;
  title: string;
  amount: string;
  currency: string;
  pipeline: string;
  stage: string;
  company: string | null;
  primary_contact: string | null;
  owner: string | null;
  expected_close_date: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  custom_fields: Record<string, unknown>;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company: string | null;
  owner: string | null;
  tags: string[];
  lead_source: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  owner: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DecodedToken {
  sub: string;
  org: string;
  role: string;
  email: string;
  exp: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
