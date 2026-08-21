-- Phase 2: pilot tenant seed (CLAUDE.md section 1 — Jamhuriya University is the initial pilot
-- university). Onboarding further universities is a Phase 7 admin-console concern; for the pilot
-- this row is created once here rather than through an application "create university" endpoint.
INSERT INTO universities (id, name, slug, city, status, created_at, updated_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'Jamhuriya University', 'jamhuriya-university', 'Mogadishu', 'VERIFIED', now(), now());

INSERT INTO departments (id, university_id, name, code, created_at) VALUES
    ('11111111-1111-4111-8111-1111111110c1', '11111111-1111-4111-8111-111111111111', 'Computer Science', 'CS', now()),
    ('11111111-1111-4111-8111-1111111110c2', '11111111-1111-4111-8111-111111111111', 'Business Administration', 'BA', now()),
    ('11111111-1111-4111-8111-1111111110c3', '11111111-1111-4111-8111-111111111111', 'Engineering', 'ENG', now()),
    ('11111111-1111-4111-8111-1111111110c4', '11111111-1111-4111-8111-111111111111', 'Health Sciences', 'HS', now()),
    ('11111111-1111-4111-8111-1111111110c5', '11111111-1111-4111-8111-111111111111', 'Law', 'LAW', now());
