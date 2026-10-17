"""brain conversations and messages schema

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'brain_conversations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('feature', sa.String(length=64), nullable=False),
        sa.Column('challenge_id', sa.String(), nullable=True),
        sa.Column('language', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_brain_conversations_challenge_id'), 'brain_conversations', ['challenge_id'], unique=False)
    op.create_index(op.f('ix_brain_conversations_feature'), 'brain_conversations', ['feature'], unique=False)
    op.create_index(op.f('ix_brain_conversations_user_id'), 'brain_conversations', ['user_id'], unique=False)
    op.create_index('ix_brain_conversations_user_updated', 'brain_conversations', ['user_id', 'updated_at'], unique=False)

    op.create_table(
        'brain_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('conversation_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sources', sa.JSON(), nullable=True),
        sa.Column('suggested_followups', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['brain_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_brain_messages_conversation_id'), 'brain_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_brain_messages_created_at'), 'brain_messages', ['created_at'], unique=False)
    op.create_index('ix_brain_messages_conv_created', 'brain_messages', ['conversation_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_brain_messages_conv_created', table_name='brain_messages')
    op.drop_index(op.f('ix_brain_messages_created_at'), table_name='brain_messages')
    op.drop_index(op.f('ix_brain_messages_conversation_id'), table_name='brain_messages')
    op.drop_table('brain_messages')
    op.drop_index('ix_brain_conversations_user_updated', table_name='brain_conversations')
    op.drop_index(op.f('ix_brain_conversations_user_id'), table_name='brain_conversations')
    op.drop_index(op.f('ix_brain_conversations_feature'), table_name='brain_conversations')
    op.drop_index(op.f('ix_brain_conversations_challenge_id'), table_name='brain_conversations')
    op.drop_table('brain_conversations')
