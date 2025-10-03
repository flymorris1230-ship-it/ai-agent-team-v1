#!/usr/bin/env python3
"""
PostgreSQL HTTP Proxy for Cloudflare Workers
Provides HTTP interface to PostgreSQL database with pgvector support
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from datetime import datetime

app = FastAPI(
    title="PostgreSQL Proxy API",
    description="HTTP proxy for PostgreSQL with pgvector support",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Workers domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', '192.168.1.114'),
    'port': int(os.getenv('POSTGRES_PORT', '5532')),
    'database': os.getenv('POSTGRES_DB', 'postgres'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'Morris1230')
}

# API Key for authentication
API_KEY = os.getenv('PROXY_API_KEY', 'your-secure-api-key-here')


# Request Models
class QueryRequest(BaseModel):
    sql: str
    params: Optional[List[Any]] = []


class VectorSearchRequest(BaseModel):
    table: str
    embedding: List[float]
    limit: int = 10
    threshold: float = 0.7
    metric: str = 'cosine'  # cosine, l2, inner_product


class DocumentInsertRequest(BaseModel):
    title: str
    content: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None


class ChunkInsertRequest(BaseModel):
    document_id: str
    chunk_index: int
    content: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None


# Helper Functions
def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key"""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()

        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.post("/query")
async def execute_query(request: QueryRequest, api_key: str = Header(..., alias="x-api-key")):
    """Execute SQL query"""
    verify_api_key(api_key)

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(request.sql, request.params)

        # Check if it's a SELECT query
        if cur.description:
            rows = cur.fetchall()
            result = {
                "rows": [dict(row) for row in rows],
                "rowCount": len(rows)
            }
        else:
            conn.commit()
            result = {
                "rows": [],
                "rowCount": cur.rowcount
            }

        cur.close()
        conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@app.post("/vector-search")
async def vector_search(request: VectorSearchRequest, api_key: str = Header(..., alias="x-api-key")):
    """Vector similarity search using pgvector"""
    verify_api_key(api_key)

    # Determine operator based on metric
    operator_map = {
        'cosine': '<=>',
        'l2': '<->',
        'inner_product': '<#>'
    }
    operator = operator_map.get(request.metric, '<=>')

    # Build SQL query
    embedding_str = '[' + ','.join(map(str, request.embedding)) + ']'

    sql = f"""
        SELECT *,
               1 - (embedding {operator} %s::vector) AS similarity
        FROM {request.table}
        WHERE 1 - (embedding {operator} %s::vector) >= %s
        ORDER BY embedding {operator} %s::vector
        LIMIT %s
    """

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(sql, [
            embedding_str,
            embedding_str,
            request.threshold,
            embedding_str,
            request.limit
        ])

        rows = cur.fetchall()
        result = [dict(row) for row in rows]

        cur.close()
        conn.close()

        return {
            "rows": result,
            "rowCount": len(result)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {str(e)}")


@app.post("/documents/insert")
async def insert_document(request: DocumentInsertRequest, api_key: str = Header(..., alias="x-api-key")):
    """Insert document with embedding"""
    verify_api_key(api_key)

    embedding_str = '[' + ','.join(map(str, request.embedding)) + ']'
    metadata_json = json.dumps(request.metadata) if request.metadata else '{}'

    sql = """
        INSERT INTO documents (
            title, content, embedding, metadata,
            content_type, source, created_at, updated_at
        ) VALUES (%s, %s, %s::vector, %s::jsonb, %s, %s, NOW(), NOW())
        RETURNING id
    """

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(sql, [
            request.title,
            request.content,
            embedding_str,
            metadata_json,
            'text',
            'api'
        ])

        result = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return {"id": result['id']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document insert failed: {str(e)}")


@app.post("/chunks/insert")
async def insert_chunk(request: ChunkInsertRequest, api_key: str = Header(..., alias="x-api-key")):
    """Insert document chunk with embedding"""
    verify_api_key(api_key)

    embedding_str = '[' + ','.join(map(str, request.embedding)) + ']'
    metadata_json = json.dumps(request.metadata) if request.metadata else '{}'

    sql = """
        INSERT INTO document_chunks (
            document_id, chunk_index, content, embedding, metadata, created_at
        ) VALUES (%s, %s, %s, %s::vector, %s::jsonb, NOW())
        RETURNING id
    """

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(sql, [
            request.document_id,
            request.chunk_index,
            request.content,
            embedding_str,
            metadata_json
        ])

        result = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return {"id": result['id']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunk insert failed: {str(e)}")


@app.get("/pgvector/status")
async def pgvector_status(api_key: str = Header(..., alias="x-api-key")):
    """Check pgvector extension status"""
    verify_api_key(api_key)

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Check if pgvector is installed
        cur.execute(
            "SELECT * FROM pg_available_extensions WHERE name = 'vector'"
        )
        extension = cur.fetchone()

        # Check if pgvector is enabled
        cur.execute(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        )
        enabled = cur.fetchone()

        cur.close()
        conn.close()

        return {
            "installed": extension is not None,
            "enabled": enabled is not None,
            "version": extension['default_version'] if extension else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"pgvector status check failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
