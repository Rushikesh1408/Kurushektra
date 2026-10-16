"""cognicode adaptive and evidence schema

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update execution_jobs
    op.add_column('execution_jobs', sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('execution_jobs', sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'))

    # 2. learning_events
    op.create_table(
        'learning_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(length=32), nullable=False),
        sa.Column('challenge_id', sa.String(length=36), sa.ForeignKey('challenges.id', ondelete='SET NULL'), nullable=True),
        sa.Column('submission_id', sa.String(length=36), sa.ForeignKey('submissions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('concept_id', sa.String(length=64), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('evidence_source', sa.String(length=60), nullable=False, server_default='platform'),
        sa.Column('correlation_id', sa.String(length=64), nullable=True),
    )
    op.create_index('ix_learning_events_user_time', 'learning_events', ['user_id', 'timestamp'])
    op.create_index('ix_learning_events_type_time', 'learning_events', ['event_type', 'timestamp'])

    # 3. student_error_patterns
    op.create_table(
        'student_error_patterns',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pattern_key', sa.String(length=80), nullable=False),
        sa.Column('pattern_name', sa.String(length=120), nullable=False),
        sa.Column('category', sa.String(length=60), nullable=False, server_default='syntax_semantics'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('occurrence_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('first_observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('evidence_events', sa.JSON(), nullable=True),
        sa.Column('remediation_advice', sa.Text(), nullable=True),
    )
    op.create_index('ix_student_error_patterns_user_status', 'student_error_patterns', ['user_id', 'status'])

    # 4. concepts
    op.create_table(
        'concepts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('slug', sa.String(length=64), nullable=False, unique=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('category', sa.String(length=60), nullable=False, server_default='fundamentals'),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('language', sa.String(length=40), nullable=False, server_default='universal'),
        sa.Column('difficulty', sa.String(length=32), nullable=False, server_default='easy'),
        sa.Column('target_depth', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. concept_prerequisites
    op.create_table(
        'concept_prerequisites',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('concept_id', sa.String(length=36), sa.ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('prerequisite_id', sa.String(length=36), sa.ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('concept_id', 'prerequisite_id', name='uq_concept_prerequisite'),
    )

    # 6. concept_mastery
    op.create_table(
        'concept_mastery',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('concept_id', sa.String(length=36), sa.ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mastery_score', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.2'),
        sa.Column('bkt_p_know', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('bkt_p_transit', sa.Float(), nullable=False, server_default='0.2'),
        sa.Column('bkt_p_slip', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('bkt_p_guess', sa.Float(), nullable=False, server_default='0.2'),
        sa.Column('total_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_assessed_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'concept_id', name='uq_user_concept_mastery'),
    )
    op.create_index('ix_concept_mastery_user_score', 'concept_mastery', ['user_id', 'mastery_score'])

    # 7. revision_schedules
    op.create_table(
        'revision_schedules',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('concept_id', sa.String(length=36), sa.ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('interval_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('repetitions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ease_factor', sa.Float(), nullable=False, server_default='2.5'),
        sa.Column('last_revised_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.UniqueConstraint('user_id', 'concept_id', name='uq_user_concept_revision'),
    )
    op.create_index('ix_revision_schedules_user_due', 'revision_schedules', ['user_id', 'due_date'])

    # 8. code_prediction_tasks
    op.create_table(
        'code_prediction_tasks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('submission_id', sa.String(length=36), sa.ForeignKey('submissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('original_code', sa.Text(), nullable=False),
        sa.Column('modified_code', sa.Text(), nullable=False),
        sa.Column('diff_summary', sa.String(length=255), nullable=False),
        sa.Column('target_concept', sa.String(length=64), nullable=True),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('expected_outcome', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 9. code_prediction_attempts
    op.create_table(
        'code_prediction_attempts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('task_id', sa.String(length=36), sa.ForeignKey('code_prediction_tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('predicted_output', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('actual_output', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('difference_explanation', sa.Text(), nullable=True),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_code_prediction_attempts_user_task', 'code_prediction_attempts', ['user_id', 'task_id'])

    # 10. knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('course', sa.String(length=80), nullable=False, server_default='cs101'),
        sa.Column('topic', sa.String(length=80), nullable=False, server_default='general'),
        sa.Column('language', sa.String(length=40), nullable=False, server_default='universal'),
        sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='all'),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('access_scope', sa.String(length=32), nullable=False, server_default='public'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 11. knowledge_chunks
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('document_id', sa.String(length=36), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('code_snippets', sa.JSON(), nullable=True),
        sa.Column('keywords', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_knowledge_chunks_doc_idx', 'knowledge_chunks', ['document_id', 'chunk_index'])

    # 12. offline_sync_records
    op.create_table(
        'offline_sync_records',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('idempotency_key', sa.String(length=64), nullable=False),
        sa.Column('action_type', sa.String(length=40), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='received'),
        sa.Column('client_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payload_json', sa.JSON(), nullable=True),
        sa.Column('result_summary', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'idempotency_key', name='uq_sync_user_idempotency'),
    )
    op.create_index('ix_offline_sync_records_user_status', 'offline_sync_records', ['user_id', 'status'])


def downgrade() -> None:
    op.drop_table('offline_sync_records')
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('code_prediction_attempts')
    op.drop_table('code_prediction_tasks')
    op.drop_table('revision_schedules')
    op.drop_table('concept_mastery')
    op.drop_table('concept_prerequisites')
    op.drop_table('concepts')
    op.drop_table('student_error_patterns')
    op.drop_table('learning_events')
    op.drop_column('execution_jobs', 'max_retries')
    op.drop_column('execution_jobs', 'retry_count')
