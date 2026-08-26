package com.fursadhub.internshipmanagement.application;

import com.fursadhub.internshipmanagement.domain.InternshipPolicy;
import com.fursadhub.internshipmanagement.domain.InternshipPolicyRepository;
import com.fursadhub.internshipmanagement.domain.PlacementPolicySnapshot;
import com.fursadhub.internshipmanagement.domain.PlacementPolicySnapshotRepository;
import com.fursadhub.internshipmanagement.domain.PolicySource;
import com.fursadhub.internshipmanagement.domain.ResolvedInternshipPolicy;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Resolves which completion requirements apply to a placement, and freezes them (CLAUDE.md
 * section 41, Phase 6 sections 3-4).
 *
 * <p><strong>Precedence</strong> — exactly two configured levels, checked in order:
 * <ol>
 *   <li>the department override for the placement's OWN department,</li>
 *   <li>the university-wide default for the placement's OWN university,</li>
 *   <li>otherwise the platform default, in which every requirement is disabled.</li>
 * </ol>
 * A department override REPLACES the university default rather than merging with it. Merging would
 * mean a department could only ever add requirements, never waive one, and it would make the
 * effective policy something nobody can read off a single row.
 *
 * <p>The platform default deliberately requires nothing. FursadHub does not know any university's
 * academic regulations, and a default that invented them would silently block real internships from
 * completing on rules nobody agreed to.
 *
 * <p><strong>Freezing</strong> — the resolved values are written to a {@link PlacementPolicySnapshot}
 * the first time any Phase 6 activity touches the placement, and every later read returns that
 * snapshot. Editing a policy afterwards changes what NEW placements require and never rewrites what
 * an existing one required.
 */
@Service
public class InternshipPolicyResolver {

    private final InternshipPolicyRepository policies;
    private final PlacementPolicySnapshotRepository snapshots;

    public InternshipPolicyResolver(
            InternshipPolicyRepository policies, PlacementPolicySnapshotRepository snapshots) {
        this.policies = policies;
        this.snapshots = snapshots;
    }

    /**
     * The requirements that govern this placement, frozen on first call.
     *
     * <p>Idempotent under concurrency: two simultaneous first-touches both compute the same values
     * and both try to insert, {@code uk_pps_placement} lets exactly one through, and the loser reads
     * the winner's row. Either way the placement ends up with one snapshot, and since both computed
     * from the same configuration the outcome is identical whichever won.
     */
    @Transactional
    public ResolvedInternshipPolicy resolveAndFreeze(Placement placement) {
        return snapshots.findByPlacementId(placement.getId())
                .map(PlacementPolicySnapshot::toResolved)
                .orElseGet(() -> freeze(placement));
    }

    /**
     * The requirements as they would be resolved today, WITHOUT freezing anything.
     *
     * <p>Used only for showing university staff the effect of their configuration. Never used for
     * completion decisions — those must always go through {@link #resolveAndFreeze}, or a policy edit
     * could retroactively change the verdict on an in-flight internship.
     */
    public ResolvedInternshipPolicy previewFor(UUID universityId, UUID departmentId) {
        return resolveFromConfiguration(universityId, departmentId);
    }

    private ResolvedInternshipPolicy freeze(Placement placement) {
        ResolvedInternshipPolicy resolved =
                resolveFromConfiguration(placement.getUniversityId(), placement.getDepartmentId());
        try {
            snapshots.saveAndFlush(PlacementPolicySnapshot.freeze(placement.getId(), resolved));
            return resolved;
        } catch (DataIntegrityViolationException e) {
            // Another request froze it first. Its values win — they were computed from the same
            // configuration, so this is a genuine tie, not a lost update.
            return snapshots.findByPlacementId(placement.getId())
                    .map(PlacementPolicySnapshot::toResolved)
                    .orElseThrow(() -> e);
        }
    }

    private ResolvedInternshipPolicy resolveFromConfiguration(UUID universityId, UUID departmentId) {
        if (departmentId != null) {
            var override = policies.findDepartmentOverride(universityId, departmentId);
            if (override.isPresent()) {
                return override.get().resolvedAs(PolicySource.DEPARTMENT);
            }
        }
        return policies.findUniversityDefault(universityId)
                .map(policy -> policy.resolvedAs(PolicySource.UNIVERSITY))
                .orElseGet(ResolvedInternshipPolicy::platformDefault);
    }

    /** The configured row behind a level, if the university has created one. */
    public InternshipPolicy findConfigured(UUID universityId, UUID departmentId) {
        return departmentId == null
                ? policies.findUniversityDefault(universityId).orElse(null)
                : policies.findDepartmentOverride(universityId, departmentId).orElse(null);
    }
}
