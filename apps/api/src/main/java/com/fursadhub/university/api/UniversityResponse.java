package com.fursadhub.university.api;

import com.fursadhub.university.domain.University;

public record UniversityResponse(String id, String name, String slug, String city, String status) {

    public static UniversityResponse from(University university) {
        return new UniversityResponse(
                university.getId().toString(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getStatus().name());
    }
}
