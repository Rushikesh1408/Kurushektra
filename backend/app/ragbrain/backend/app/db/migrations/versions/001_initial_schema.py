"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-17 03:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('external_id', sa.String(255), unique=True, nullable=True),
        sa.Column('email', sa.String(320), unique=True, nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('role', sa.String(32), nullable=False, server_default='student'),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_external_id', 'users', ['external_id'])

    # 2. topics
    op.create_table(
        'topics',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), unique=True, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('difficulty_level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('prerequisites', sa.JSON(), nullable=False),
        sa.Column('subject', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. assignments
    op.create_table(
        'assignments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('topic_id', sa.String(36), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('difficulty_level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.Column('language_name', sa.String(64), nullable=False),
        sa.Column('time_limit_seconds', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('memory_limit_kb', sa.Integer(), nullable=False, server_default='262144'),
        sa.Column('rubric', sa.JSON(), nullable=False),
        sa.Column('rubric_version', sa.String(32), nullable=False, server_default='1.0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_assignments_topic_id', 'assignments', ['topic_id'])

    # 4. test_cases
    op.create_table(
        'test_cases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('assignment_id', sa.String(36), sa.ForeignKey('assignments.id'), nullable=False),
        sa.Column('stdin', sa.Text(), nullable=True),
        sa.Column('expected_output', sa.Text(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('points', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('description', sa.String(500), nullable=True),
    )
    op.create_index('ix_test_cases_assignment_id', 'test_cases', ['assignment_id'])

    # 5. knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('filename', sa.String(500), nullable=True),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('source', sa.String(1000), nullable=True),
        sa.Column('subject', sa.String(128), nullable=True),
        sa.Column('topic_tags', sa.JSON(), nullable=False),
        sa.Column('difficulty_level', sa.Integer(), nullable=True),
        sa.Column('language', sa.String(32), nullable=False, server_default='en'),
        sa.Column('access_level', sa.String(64), nullable=False, server_default='student'),
        sa.Column('course_id', sa.String(255), nullable=True),
        sa.Column('assignment_id', sa.String(36), nullable=True),
        sa.Column('qdrant_ids', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_kd_content_hash', 'knowledge_documents', ['content_hash'])
    op.create_index('ix_kd_status_subject', 'knowledge_documents', ['status', 'subject'])

    # 6. submissions
    op.create_table(
        'submissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('student_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assignment_id', sa.String(36), sa.ForeignKey('assignments.id'), nullable=False),
        sa.Column('code_hash', sa.String(64), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('judge0_token', sa.String(255), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_submissions_student_id', 'submissions', ['student_id'])
    op.create_index('ix_submissions_assignment_id', 'submissions', ['assignment_id'])
    op.create_index('ix_sub_student_assignment', 'submissions', ['student_id', 'assignment_id'])

    # 7. execution_results
    op.create_table(
        'execution_results',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('submission_id', sa.String(36), sa.ForeignKey('submissions.id'), unique=True, nullable=False),
        sa.Column('judge0_status_id', sa.Integer(), nullable=True),
        sa.Column('judge0_status_description', sa.String(128), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('compile_output', sa.Text(), nullable=True),
        sa.Column('time_seconds', sa.Float(), nullable=True),
        sa.Column('memory_kb', sa.Integer(), nullable=True),
        sa.Column('exit_code', sa.Integer(), nullable=True),
        sa.Column('is_infrastructure_failure', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('raw_response', sa.JSON(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 8. evaluation_reports
    op.create_table(
        'evaluation_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('submission_id', sa.String(36), sa.ForeignKey('submissions.id'), unique=True, nullable=False),
        sa.Column('rubric_version', sa.String(32), nullable=False),
        sa.Column('total_points', sa.Float(), nullable=False),
        sa.Column('earned_points', sa.Float(), nullable=False),
        sa.Column('score_fraction', sa.Float(), nullable=False),
        sa.Column('tests_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tests_passed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tests_failed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('compilation_passed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('runtime_passed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('feedback_summary', sa.Text(), nullable=True),
        sa.Column('retrieved_references', sa.JSON(), nullable=False),
        sa.Column('is_infrastructure_failure', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('model_version', sa.String(128), nullable=True),
        sa.Column('service_versions', sa.JSON(), nullable=False),
    )

    # 9. skill_profiles
    op.create_table(
        'skill_profiles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('topic_id', sa.String(36), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('mastery_level', sa.String(32), nullable=False, server_default='not_attempted'),
        sa.Column('mastery_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('attempts_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('attempts_passed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_attempted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_assessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recommended_next', sa.String(255), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'topic_id', name='uq_skill_user_topic')
    )
    op.create_index('ix_skill_profiles_user_id', 'skill_profiles', ['user_id'])
    op.create_index('ix_skill_profiles_topic_id', 'skill_profiles', ['topic_id'])

    # 10. mastery_records
    op.create_table(
        'mastery_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('skill_profile_id', sa.String(36), sa.ForeignKey('skill_profiles.id'), nullable=False),
        sa.Column('topic_id', sa.String(36), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('submission_id', sa.String(36), sa.ForeignKey('submissions.id'), nullable=True),
        sa.Column('previous_mastery', sa.String(32), nullable=True),
        sa.Column('new_mastery', sa.String(32), nullable=False),
        sa.Column('previous_score', sa.Float(), nullable=True),
        sa.Column('new_score', sa.Float(), nullable=False),
        sa.Column('algorithm_version', sa.String(32), nullable=False, server_default='1.0'),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_mastery_records_skill_profile_id', 'mastery_records', ['skill_profile_id'])

    # 11. mistake_diagnoses
    op.create_table(
        'mistake_diagnoses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('submission_id', sa.String(36), sa.ForeignKey('submissions.id'), nullable=False),
        sa.Column('student_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('error_category', sa.String(64), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('diagnostic_method', sa.String(64), nullable=False),
        sa.Column('evidence', sa.JSON(), nullable=False),
        sa.Column('retrieved_doc_ids', sa.JSON(), nullable=False),
        sa.Column('hint_provided', sa.Text(), nullable=True),
        sa.Column('explanation_provided', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_mistake_diagnoses_submission_id', 'mistake_diagnoses', ['submission_id'])
    op.create_index('ix_mistake_diagnoses_student_id', 'mistake_diagnoses', ['student_id'])

    # 12. interventions
    op.create_table(
        'interventions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('student_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('topic_id', sa.String(36), sa.ForeignKey('topics.id'), nullable=False),
        sa.Column('diagnosis_id', sa.String(36), sa.ForeignKey('mistake_diagnoses.id'), nullable=True),
        sa.Column('intervention_type', sa.String(64), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('recommended_assignment_id', sa.String(36), sa.ForeignKey('assignments.id'), nullable=True),
        sa.Column('policy_version', sa.String(32), nullable=False, server_default='1.0'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('mastery_score_before', sa.Float(), nullable=True),
        sa.Column('mastery_score_after', sa.Float(), nullable=True),
        sa.Column('was_effective', sa.Boolean(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('assessed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_interventions_student_id', 'interventions', ['student_id'])
    op.create_index('ix_interventions_topic_id', 'interventions', ['topic_id'])
    op.create_index('ix_intv_student_topic', 'interventions', ['student_id', 'topic_id'])

    # 13. audit_events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('actor_id', sa.String(36), nullable=True),
        sa.Column('actor_role', sa.String(64), nullable=True),
        sa.Column('action', sa.String(255), nullable=False),
        sa.Column('resource_type', sa.String(128), nullable=True),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('request_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(64), nullable=True),
        sa.Column('outcome', sa.String(64), nullable=False, server_default='success'),
        sa.Column('detail', sa.JSON(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_events_action', 'audit_events', ['action'])
    op.create_index('ix_audit_events_actor_id', 'audit_events', ['actor_id'])
    op.create_index('ix_audit_events_recorded_at', 'audit_events', ['recorded_at'])


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('interventions')
    op.drop_table('mistake_diagnoses')
    op.drop_table('mastery_records')
    op.drop_table('skill_profiles')
    op.drop_table('evaluation_reports')
    op.drop_table('execution_results')
    op.drop_table('submissions')
    op.drop_table('knowledge_documents')
    op.drop_table('test_cases')
    op.drop_table('assignments')
    op.drop_table('topics')
    op.drop_table('users')
