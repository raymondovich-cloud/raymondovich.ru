-- version 1.0
-- Закрепление проектов в приватной административной панели.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pin_order integer;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_pin_order_nonnegative
  CHECK (pin_order IS NULL OR pin_order >= 0);

CREATE INDEX IF NOT EXISTS projects_pinned_order_idx
  ON public.projects (owner_id, is_pinned DESC, pin_order ASC NULLS LAST, updated_at DESC);
