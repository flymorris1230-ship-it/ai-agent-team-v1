#!/usr/bin/env python3
"""
PostgreSQL HTTP Proxy for Cloudflare Tunnel
Exposes PostgreSQL pgvector database via HTTP for secure remote access

Port Configuration:
- HTTP Server: 8000 (Cloudflare Tunnel endpoint)
- PostgreSQL: 5532 (Local NAS pgvector database)

Usage:
    python3 nas-postgres-proxy.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime

# Configuration from environment variables
POSTGRES_HOST = os.getenv('POSTGRES_HOST', '192.168.1.114')
POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', '5532'))
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'postgres')
PROXY_API_KEY = os.getenv('PROXY_API_KEY', 'CHANGE_ME_IN_PRODUCTION')
SERVER_PORT = int(os.getenv('SERVER_PORT', '8000'))

# Try to import psycopg2
try:
    import psycopg2
    from psycopg2 import pool
    PSYCOPG2_AVAILABLE = True
except ImportError:
    print("⚠️  Warning: psycopg2 not installed. Install with: pip3 install psycopg2-binary")
    PSYCOPG2_AVAILABLE = False
    pool = None

# Connection pool for better performance
connection_pool = None

def init_connection_pool():
    """Initialize PostgreSQL connection pool"""
    global connection_pool
    if not PSYCOPG2_AVAILABLE:
        print("❌ Cannot initialize connection pool: psycopg2 not available")
        return False

    try:
        connection_pool = pool.SimpleConnectionPool(
            1, 10,  # min and max connections
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB
        )
        print(f"✅ Connection pool initialized: {POSTGRES_HOST}:{POSTGRES_PORT}")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize connection pool: {e}")
        return False

def get_connection():
    """Get a connection from the pool"""
    if connection_pool:
        return connection_pool.getconn()
    return None

def release_connection(conn):
    """Release connection back to pool"""
    if connection_pool and conn:
        connection_pool.putconn(conn)

class ProxyHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for PostgreSQL Proxy"""

    def _set_headers(self, status=200, content_type='application/json'):
        """Set HTTP response headers"""
        self.send_response(status)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        self.end_headers()

    def _check_auth(self):
        """Check API key authentication"""
        api_key = self.headers.get('X-API-Key', '')
        if PROXY_API_KEY == 'CHANGE_ME_IN_PRODUCTION':
            # In development, allow without auth but warn
            return True
        return api_key == PROXY_API_KEY

    def _json_response(self, data, status=200):
        """Send JSON response"""
        self._set_headers(status)
        self.wfile.write(json.dumps(data, indent=2, default=str).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self._set_headers()

    def do_GET(self):
        """Handle GET requests"""

        # Health check endpoint (no auth required)
        if self.path == '/health':
            self._handle_health_check()
            return

        # Info endpoint (no auth required)
        if self.path == '/info':
            self._handle_info()
            return

        # All other endpoints require authentication
        if not self._check_auth():
            self._json_response({
                'success': False,
                'error': 'Unauthorized - Invalid or missing API key'
            }, 401)
            return

        # Test database connection
        if self.path == '/test':
            self._handle_test()
            return

        # Default 404
        self._json_response({
            'success': False,
            'error': 'Not Found',
            'available_endpoints': ['/health', '/info', '/test']
        }, 404)

    def _handle_health_check(self):
        """Health check with database connectivity test"""
        start_time = datetime.now()

        if not PSYCOPG2_AVAILABLE:
            self._json_response({
                'status': 'degraded',
                'message': 'psycopg2 not installed',
                'database': 'unavailable',
                'timestamp': start_time.isoformat()
            }, 503)
            return

        conn = None
        try:
            conn = get_connection()
            if not conn:
                raise Exception("Could not get connection from pool")

            cursor = conn.cursor()
            cursor.execute('SELECT version()')
            version = cursor.fetchone()[0]
            cursor.close()

            # Check for pgvector extension
            cursor = conn.cursor()
            cursor.execute("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')")
            has_pgvector = cursor.fetchone()[0]
            cursor.close()

            response_time = (datetime.now() - start_time).total_seconds() * 1000

            self._json_response({
                'status': 'healthy',
                'database': 'connected',
                'host': f"{POSTGRES_HOST}:{POSTGRES_PORT}",
                'version': version,
                'pgvector': 'available' if has_pgvector else 'not installed',
                'response_time_ms': round(response_time, 2),
                'timestamp': datetime.now().isoformat()
            })

        except Exception as e:
            self._json_response({
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }, 503)
        finally:
            if conn:
                release_connection(conn)

    def _handle_info(self):
        """Proxy information endpoint"""
        self._json_response({
            'name': 'PostgreSQL HTTP Proxy',
            'version': '1.0.0',
            'purpose': 'Cloudflare Tunnel → PostgreSQL pgvector bridge',
            'server_port': SERVER_PORT,
            'postgres_host': POSTGRES_HOST,
            'postgres_port': POSTGRES_PORT,
            'postgres_db': POSTGRES_DB,
            'auth_required': PROXY_API_KEY != 'CHANGE_ME_IN_PRODUCTION',
            'endpoints': {
                '/health': 'Health check with database connectivity test',
                '/info': 'This endpoint - proxy information',
                '/test': 'Test database operations (requires API key)'
            }
        })

    def _handle_test(self):
        """Test database operations"""
        conn = None
        try:
            conn = get_connection()
            if not conn:
                raise Exception("Could not get connection from pool")

            cursor = conn.cursor()

            # Test basic query
            cursor.execute('SELECT 1 as test')
            result = cursor.fetchone()

            # Get table count
            cursor.execute("""
                SELECT count(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
            """)
            table_count = cursor.fetchone()[0]

            cursor.close()

            self._json_response({
                'success': True,
                'test_query': 'SELECT 1' if result[0] == 1 else 'FAILED',
                'table_count': table_count,
                'message': 'Database connection and queries working'
            })

        except Exception as e:
            self._json_response({
                'success': False,
                'error': str(e)
            }, 500)
        finally:
            if conn:
                release_connection(conn)

    def log_message(self, format, *args):
        """Custom log format"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {self.address_string()} - {format % args}")

def main():
    """Main server loop"""
    print("=" * 60)
    print("🚀 PostgreSQL HTTP Proxy for Cloudflare Tunnel")
    print("=" * 60)
    print(f"📍 HTTP Server Port: {SERVER_PORT}")
    print(f"🗄️  PostgreSQL: {POSTGRES_HOST}:{POSTGRES_PORT}")
    print(f"📊 Database: {POSTGRES_DB}")
    print(f"👤 User: {POSTGRES_USER}")
    print(f"🔐 API Key: {'SET' if PROXY_API_KEY != 'CHANGE_ME_IN_PRODUCTION' else '⚠️  NOT SET (DEVELOPMENT MODE)'}")
    print("=" * 60)

    if PROXY_API_KEY == 'CHANGE_ME_IN_PRODUCTION':
        print("⚠️  WARNING: Running in development mode without API key protection!")
        print("⚠️  Set PROXY_API_KEY environment variable for production use")
        print()

    # Initialize connection pool
    if PSYCOPG2_AVAILABLE:
        if not init_connection_pool():
            print("❌ Failed to initialize. Check PostgreSQL connection settings.")
            sys.exit(1)
    else:
        print("⚠️  Running in limited mode - install psycopg2-binary for full functionality")

    # Start HTTP server
    try:
        server = HTTPServer(('0.0.0.0', SERVER_PORT), ProxyHandler)
        print(f"✅ Proxy server running on http://0.0.0.0:{SERVER_PORT}")
        print(f"📡 Ready to accept Cloudflare Tunnel connections")
        print(f"🔍 Health check: http://localhost:{SERVER_PORT}/health")
        print()
        print("Press Ctrl+C to stop")
        print("=" * 60)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down proxy server...")
        if connection_pool:
            connection_pool.closeall()
        print("✅ Server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
