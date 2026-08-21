-- Phase 2: student profile and claimed university enrollment (CLAUDE.md section 28).
CREATE TABLE student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY,
    student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities (id),
    department_id UUID NOT NULL REFERENCES departments (id),
    student_number VARCHAR(60) NOT NULL,
    program VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    verification_status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_student_enrollments_student UNIQUE (student_user_id),
    -- CLAUDE.md section 28 critical invariant.
    CONSTRAINT uk_student_enrollments_university_student_number UNIQUE (university_id, student_number)
);

CREATE INDEX idx_student_enrollments_university_id ON student_enrollments (university_id);
CREATE INDEX idx_student_enrollments_university_department ON student_enrollments (university_id, department_id);
