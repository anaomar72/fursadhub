package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminAccountService;
import com.fursadhub.administration.application.PlatformAdminService;
import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.administration.application.PlatformStatisticsService;
import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformStatistics;
import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Platform administration: accounts, platform roles and operational statistics (Phase 7 "Admin").
 *
 * <p>Authorization lives in the application services, not here — every method below re-checks the
 * caller's current platform grant against PostgreSQL, so a revoked administrator loses access on
 * their next call rather than when their access token expires.
 *
 * <p><strong>There is no impersonation endpoint</strong>, in this controller or anywhere else. Phase 7
 * forbids it, and an administrator who could act as another user would make every audit event in the
 * system ambiguous about who really did the thing.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PlatformAuthorization platformAuthorization;
    private final PlatformAdminService platformAdminService;
    private final AdminAccountService accountService;
    private final PlatformStatisticsService statisticsService;
    private final UserRepository users;

    public AdminController(
            PlatformAuthorization platformAuthorization,
            PlatformAdminService platformAdminService,
            AdminAccountService accountService,
            PlatformStatisticsService statisticsService,
            UserRepository users) {
        this.platformAuthorization = platformAuthorization;
        this.platformAdminService = platformAdminService;
        this.accountService = accountService;
        this.statisticsService = statisticsService;
        this.users = users;
    }

    /**
     * The caller's own platform roles. Deliberately open to any authenticated user and answered with
     * an empty list rather than a 403: it is the probe the web app uses to decide whether to render
     * an Admin area, and it only ever describes the caller.
     */
    @GetMapping("/me")
    public AdminSessionResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        List<String> roles = platformAuthorization.activeGrantsOf(userId).stream()
                .map(grant -> grant.getRole().name())
                .toList();
        return new AdminSessionResponse(platformAuthorization.isPlatformAdmin(userId), roles);
    }

    // ---------------------------------------------------------------- statistics

    @GetMapping("/statistics")
    public PlatformStatistics statistics(@AuthenticationPrincipal Jwt jwt) {
        return statisticsService.collect(currentUserId(jwt));
    }

    // ---------------------------------------------------------------- accounts

    @GetMapping("/users")
    public PageResponse<AdminUserResponse> searchUsers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UserStatus status,
            @PageableDefault(size = 25) Pageable pageable) {
        Page<User> page = accountService.search(currentUserId(jwt), query, status, capPageSize(pageable));
        return PageResponse.from(page, AdminUserResponse::from);
    }

    @GetMapping("/users/{userId}")
    public AdminUserResponse user(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        return AdminUserResponse.from(accountService.get(currentUserId(jwt), userId));
    }

    /**
     * Suspends an account and revokes every active refresh session in the same transaction. Without
     * that second half, a suspended account would keep working for another thirty days.
     */
    @PostMapping("/users/{userId}/suspend")
    public MessageResponse suspendUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID userId,
            @Valid @RequestBody SuspendUserRequest request,
            HttpServletRequest httpRequest) {
        accountService.suspend(currentUserId(jwt), userId, request.reason(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Account suspended.");
    }

    @PostMapping("/users/{userId}/reactivate")
    public MessageResponse reactivateUser(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, HttpServletRequest httpRequest) {
        accountService.reactivate(currentUserId(jwt), userId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Account reactivated.");
    }

    // ---------------------------------------------------------------- platform roles

    @GetMapping("/platform-roles")
    public List<PlatformAdminResponse> platformRoles(@AuthenticationPrincipal Jwt jwt) {
        return platformAdminService.list(currentUserId(jwt)).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/platform-roles")
    public PlatformAdminResponse grantPlatformRole(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody GrantPlatformRoleRequest request,
            HttpServletRequest httpRequest) {
        PlatformAdmin granted = platformAdminService.grant(
                currentUserId(jwt), request.userId(), request.role(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return toResponse(granted);
    }

    /** Refuses to revoke the last active SUPER_ADMIN — see {@code PlatformAdminService}. */
    @PostMapping("/platform-roles/{grantId}/revoke")
    public MessageResponse revokePlatformRole(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID grantId, HttpServletRequest httpRequest) {
        platformAdminService.revoke(currentUserId(jwt), grantId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Platform role revoked.");
    }

    private PlatformAdminResponse toResponse(PlatformAdmin admin) {
        String email = users.findById(admin.getUserId()).map(User::getEmail).orElse(null);
        return PlatformAdminResponse.from(admin, email);
    }

    private Pageable capPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        Sort sort = pageable.getSortOr(Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
