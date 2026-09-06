-- Backend Phase B1: indexes for the public organization and university directories.
--
-- Additive only. No table, column, type, constraint or data is touched, so this is safe against a
-- non-empty production database and its rollback is a plain DROP INDEX with no data implications.
--
-- Each index below was checked against the ACTUAL query the repository issues and against the
-- indexes that already exist (V9, V14, V16). Two indexes predicted during planning are deliberately
-- NOT created — see the note at the bottom, which matters more than the ones that are.

-- ---------------------------------------------------------------- organization directory
--
-- Query: WHERE verification_status = 'VERIFIED'
--          AND (:type IS NULL OR type = :type)
--          AND LOWER(name) LIKE LOWER('%fragment%')
--        ORDER BY name
--
-- The leading column pins the directory's fixed precondition and the second supplies the default
-- ordering, so PostgreSQL can satisfy both the filter and the ORDER BY from one index and skip the
-- sort entirely. `organizations` previously had no index at all beyond the slug uniqueness
-- constraint, so nothing here is redundant.
CREATE INDEX idx_organizations_verification_status_name
    ON organizations (verification_status, name);

-- ---------------------------------------------------------------- university directory
--
-- The exact counterpart, against `universities.status`. Same reasoning; `universities` likewise had
-- no index beyond its slug constraint.
CREATE INDEX idx_universities_status_name
    ON universities (status, name);

-- ---------------------------------------------------------------- open-opportunity count
--
-- Query: WHERE organization_id IN (:pageIds)
--          AND status = 'PUBLISHED'
--          AND mode IN ('PUBLIC', 'HYBRID')
--        GROUP BY organization_id
--
-- Partial, so it indexes ONLY the publicly discoverable rows — the same predicate
-- PublicOpportunityVisibility defines and InternshipOpportunitySpecifications.publiclyVisible()
-- applies. That keeps it far smaller than the table and lets the grouped count be satisfied from
-- the index rather than by filtering heap rows.
--
-- Not redundant with V16's existing pair: idx_internship_opportunities_organization_id covers every
-- opportunity in any state (still the right index for an organization's own management list), and
-- idx_internship_opportunities_status_mode leads with status, so it cannot serve an
-- organization_id IN (...) lookup. This one matches the public count query exactly.
--
-- Both predicate columns are EnumType.STRING varchars compared to literals, so the predicate is
-- IMMUTABLE and valid in a partial index.
CREATE INDEX idx_internship_opportunities_public_by_organization
    ON internship_opportunities (organization_id)
    WHERE status = 'PUBLISHED' AND mode IN ('PUBLIC', 'HYBRID');

-- ---------------------------------------------------------------- deliberately NOT created
--
-- 1. An expression index on LOWER(name) for either directory.
--    The name filter is a CONTAINS match — LOWER(name) LIKE '%fragment%' — and a b-tree cannot
--    serve a leading wildcard. PostgreSQL would never choose such an index, so it would cost write
--    amplification and disk for nothing. Name search is a bounded scan over the verified subset,
--    which is the right trade at pilot scale (hundreds of institutions). The real upgrade path, if
--    the directory ever reaches six figures, is pg_trgm + GIN — not a b-tree, and not a search
--    engine (CLAUDE.md section 3 forbids Elasticsearch).
--
-- 2. A (verification_status, verified_at) index for the optional `recentlyVerified` sort.
--    That ordering is one of three the API allows and not the default; sorting a few hundred
--    verified rows in memory is free. Adding an index for a sort nobody has asked for yet would be
--    speculative (CLAUDE.md section 52: index for real query patterns, not blindly).
