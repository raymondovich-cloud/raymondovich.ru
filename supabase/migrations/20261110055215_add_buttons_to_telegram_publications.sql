ALTER TABLE public.telegram_publications
ADD COLUMN buttons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.telegram_publications
ADD CONSTRAINT telegram_publications_buttons_valid
CHECK (
  jsonb_typeof(buttons) = 'array'
  AND jsonb_array_length(buttons) <= 8
);
