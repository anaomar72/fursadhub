package com.fursadhub.placement.domain;

/**
 * The two supervisor roles a placement can carry (CLAUDE.md section 40). A placement may hold at
 * most one ACTIVE assignment of each type at a time; both types are independent of each other.
 */
public enum SupervisorType {
    UNIVERSITY,
    ORGANIZATION
}
