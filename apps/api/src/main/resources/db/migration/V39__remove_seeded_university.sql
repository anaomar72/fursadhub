-- Phase 8: universities are now fully self-registering (CreateUniversityService), so the pilot no
-- longer needs — or should have — a Flyway-seeded, pre-verified tenant. V10 stays in history
-- unedited (a migration already applied to real databases is never rewritten); this migration
-- removes what it inserted instead.
--
-- A plain DELETE FROM universities is not enough on any database where the seeded tenant was
-- actually used (as opposed to a fresh test database, where it always is): five tables hold a
-- direct, non-cascading foreign key to universities(id) — student_enrollments, opportunity_targets,
-- nominations, candidacies, placements — and Postgres refuses the delete while any of them still
-- reference this row. Every table beneath those five (verification cases and challenges,
-- opportunity_target_departments, candidacy_events, screening_answers, internship_offers, and every
-- placement child — supervisor assignments, weekly logs, attendance, evaluations, final reports,
-- defense attempts) already cascades from its own immediate parent, so deleting from the three
-- tables below — in an order where none of them depends on a later one — clears the whole tree.
-- nominations and placements are not listed explicitly: they cascade away as a side effect, via
-- their own foreign keys to opportunity_targets and candidacies respectively.
DELETE FROM opportunity_targets WHERE university_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM candidacies WHERE university_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM student_enrollments WHERE university_id = '11111111-1111-4111-8111-111111111111';

-- Departments, university_memberships and internship_policies all cascade from this FK (V9/V11/V24).
DELETE FROM universities WHERE id = '11111111-1111-4111-8111-111111111111';
