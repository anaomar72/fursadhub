-- Academic and account identity fields remain in their canonical tables.
ALTER TABLE student_profiles ADD COLUMN professional_profile jsonb;
