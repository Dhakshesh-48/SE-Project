"""Initial versioned schema for the requirements engineering system."""
from alembic import op
import database

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    database.Base.metadata.create_all(bind=op.get_bind())

def downgrade():
    database.Base.metadata.drop_all(bind=op.get_bind())
