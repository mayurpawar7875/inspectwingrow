-- Add checkbox fields to stall_inspections table
ALTER TABLE public.stall_inspections
ADD COLUMN has_table boolean DEFAULT false,
ADD COLUMN has_tent boolean DEFAULT false,
ADD COLUMN has_mat boolean DEFAULT false,
ADD COLUMN has_flex boolean DEFAULT false,
ADD COLUMN has_cap boolean DEFAULT false,
ADD COLUMN has_apron boolean DEFAULT false,
ADD COLUMN has_display boolean DEFAULT false,
ADD COLUMN has_rateboard boolean DEFAULT false;