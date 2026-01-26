"""
Test-Driven Agent (TDA) Pattern - First Test
Tests PostgreSQL connection and pgvector functionality
"""
import pytest
import psycopg2
from pgvector.psycopg2 import register_vector
import numpy as np


@pytest.fixture
def db_connection():
    """Create a database connection for testing"""
    conn = psycopg2.connect(
        host="localhost",
        database="atomic_notes",
        user="postgres",
        password="postgres"
    )
    register_vector(conn)
    yield conn
    conn.close()


def test_pgvector_extension_loaded(db_connection):
    """Test that pgvector extension is properly loaded"""
    cursor = db_connection.cursor()
    cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
    result = cursor.fetchone()
    
    assert result is not None, "pgvector extension not found"
    assert result[0] == 'vector', "Extension name mismatch"
    cursor.close()


def test_vector_storage_and_retrieval(db_connection):
    """Test storing and retrieving vector embeddings"""
    cursor = db_connection.cursor()
    
    # Create a test table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_vectors (
            id SERIAL PRIMARY KEY,
            name TEXT,
            embedding vector(3)
        )
    """)
    
    # Insert test vectors
    embedding1 = np.array([1.0, 0.0, 0.0])
    embedding2 = np.array([0.0, 1.0, 0.0])
    
    cursor.execute(
        "INSERT INTO test_vectors (name, embedding) VALUES (%s, %s)",
        ("vector1", embedding1)
    )
    cursor.execute(
        "INSERT INTO test_vectors (name, embedding) VALUES (%s, %s)",
        ("vector2", embedding2)
    )
    db_connection.commit()
    
    # Retrieve and verify
    cursor.execute("SELECT name, embedding FROM test_vectors WHERE name = 'vector1'")
    result = cursor.fetchone()
    
    assert result is not None
    assert result[0] == "vector1"
    assert np.array_equal(result[1], embedding1)
    
    # Cleanup
    cursor.execute("DROP TABLE test_vectors")
    db_connection.commit()
    cursor.close()


def test_cosine_similarity_search(db_connection):
    """Test cosine similarity search using pgvector"""
    cursor = db_connection.cursor()
    
    # Create test table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_similarity (
            id SERIAL PRIMARY KEY,
            concept TEXT,
            embedding vector(3)
        )
    """)
    
    # Insert test vectors
    # Vector 1: [1, 0, 0] - concept A
    # Vector 2: [0.9, 0.1, 0] - similar to concept A
    # Vector 3: [0, 1, 0] - concept B (orthogonal to A)
    
    cursor.execute(
        "INSERT INTO test_similarity (concept, embedding) VALUES (%s, %s)",
        ("Concept A", np.array([1.0, 0.0, 0.0]))
    )
    cursor.execute(
        "INSERT INTO test_similarity (concept, embedding) VALUES (%s, %s)",
        ("Concept A_similar", np.array([0.9, 0.1, 0.0]))
    )
    cursor.execute(
        "INSERT INTO test_similarity (concept, embedding) VALUES (%s, %s)",
        ("Concept B", np.array([0.0, 1.0, 0.0]))
    )
    db_connection.commit()
    
    # Search for vectors similar to [1, 0, 0] using cosine distance
    query_vector = np.array([1.0, 0.0, 0.0])
    
    cursor.execute("""
        SELECT concept, embedding <=> %s AS distance
        FROM test_similarity
        ORDER BY distance
        LIMIT 2
    """, (query_vector,))
    
    results = cursor.fetchall()
    
    # Verify the most similar vector is "Concept A" (distance = 0)
    assert len(results) == 2
    assert results[0][0] == "Concept A"
    assert results[0][1] < 0.01  # Almost zero distance
    
    # Second most similar should be "Concept A_similar"
    assert results[1][0] == "Concept A_similar"
    assert results[1][1] < 0.2  # Small distance
    
    # Cleanup
    cursor.execute("DROP TABLE test_similarity")
    db_connection.commit()
    cursor.close()


def test_vector_dimension_validation(db_connection):
    """Test that incorrect vector dimensions are rejected"""
    cursor = db_connection.cursor()
    
    # Create test table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_dimensions (
            id SERIAL PRIMARY KEY,
            embedding vector(3)
        )
    """)
    db_connection.commit()
    
    # Try to insert a vector with wrong dimensions
    wrong_dimension_vector = np.array([1.0, 0.0])  # Only 2 dimensions instead of 3
    
    with pytest.raises(Exception):
        cursor.execute(
            "INSERT INTO test_dimensions (embedding) VALUES (%s)",
            (wrong_dimension_vector,)
        )
        db_connection.commit()
    
    # Cleanup
    db_connection.rollback()
    cursor.execute("DROP TABLE IF EXISTS test_dimensions")
    db_connection.commit()
    cursor.close()
