#!/usr/bin/env python3
"""
Database Cleanup Script
WARNING: This will DELETE ALL DATA from the database!
Use with caution. Options:
- Full cleanup: Delete all data from all tables
- Selective cleanup: Delete specific tables
- Reset: Keep schema, delete all data
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Database URL - change this if needed
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/atomic_notes"

TABLES = [
    "relationships",  # Delete first (has FK to entities)
    "annotations",    # Delete first (has FK to entities)
    "entities",       # Delete second (has FK to notes)
    "notes",          # Delete last
]


async def get_table_counts(session):
    """Get row counts for all tables"""
    counts = {}
    for table in TABLES:
        try:
            result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
            counts[table] = result.scalar()
        except Exception as e:
            counts[table] = f"Error: {e}"
    return counts


async def cleanup_database(full_reset=False):
    """
    Clean up the database
    
    Args:
        full_reset: If True, also drop and recreate tables (not just truncate)
    """
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Show current state
            print("\n📊 Current Database State:")
            print("-" * 40)
            counts = await get_table_counts(session)
            for table, count in counts.items():
                print(f"  {table:20s}: {count} rows")
            
            total_rows = sum(c for c in counts.values() if isinstance(c, int))
            print("-" * 40)
            print(f"  {'TOTAL':20s}: {total_rows} rows\n")
            
            if total_rows == 0:
                print("✓ Database is already empty!")
                return
            
            # Confirm deletion
            print("⚠️  WARNING: This will DELETE ALL DATA from the database!")
            print("   Tables to be cleared:", ", ".join(TABLES))
            
            if full_reset:
                print("\n🔴 FULL RESET MODE: Will also drop and recreate tables")
            
            confirm = input("\nType 'DELETE' to confirm: ")
            
            if confirm != "DELETE":
                print("❌ Cancelled. No changes made.")
                return
            
            print("\n🗑️  Cleaning up database...\n")
            
            if full_reset:
                # Drop all tables
                for table in reversed(TABLES):
                    try:
                        await session.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                        print(f"  ✓ Dropped table: {table}")
                    except Exception as e:
                        print(f"  ✗ Error dropping {table}: {e}")
                
                # Recreate tables using Alembic
                print("\n🔄 Recreating tables with Alembic...")
                import subprocess
                result = subprocess.run(
                    ["alembic", "upgrade", "head"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print("  ✓ Tables recreated successfully")
                else:
                    print(f"  ✗ Alembic error: {result.stderr}")
                    
            else:
                # Just truncate data (keep tables)
                for table in TABLES:
                    try:
                        await session.execute(text(f"DELETE FROM {table}"))
                        print(f"  ✓ Cleared table: {table}")
                    except Exception as e:
                        print(f"  ✗ Error clearing {table}: {e}")
                        raise
                
                await session.commit()
            
            # Show final state
            print("\n✅ Database cleaned successfully!")
            print("\n📊 Final Database State:")
            print("-" * 40)
            counts = await get_table_counts(session)
            for table, count in counts.items():
                print(f"  {table:20s}: {count} rows")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error: {e}")
            raise
        finally:
            await engine.dispose()


def show_help():
    print("""
Database Cleanup Tool
====================

Usage: python cleanup_db.py [OPTIONS]

Options:
  --full, -f     Full reset: Drop and recreate all tables
  --help, -h     Show this help message

Examples:
  python cleanup_db.py           # Clear all data (keep tables)
  python cleanup_db.py --full    # Full reset: drop and recreate tables
  python cleanup_db.py -f        # Same as --full

WARNING: This will DELETE ALL DATA and cannot be undone!
Make sure you have backups if needed.
""")


if __name__ == "__main__":
    full_reset = False
    
    if len(sys.argv) > 1:
        if sys.argv[1] in ["--help", "-h"]:
            show_help()
            sys.exit(0)
        elif sys.argv[1] in ["--full", "-f"]:
            full_reset = True
        else:
            print(f"Unknown option: {sys.argv[1]}")
            show_help()
            sys.exit(1)
    
    asyncio.run(cleanup_database(full_reset=full_reset))
