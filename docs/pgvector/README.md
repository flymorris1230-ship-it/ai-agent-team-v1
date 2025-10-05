# 🧮 pgvector Installation Documentation

Documentation for PostgreSQL pgvector extension installation and configuration.

## 📄 Available Documents

### Installation Guides
- **[INSTALLATION.md](./INSTALLATION.md)** - Complete pgvector installation guide
- **[PGADMIN4-GUIDE.md](./PGADMIN4-GUIDE.md)** - pgAdmin4 GUI installation guide (推薦)

### Configuration & Status
- **[STATUS.md](./STATUS.md)** - Current installation status and verification
- **[PROXY-UPDATE-GUIDE.md](./PROXY-UPDATE-GUIDE.md)** - HTTP Proxy update guide

## 🚀 Quick Start

### Recommended Approach (via pgAdmin4)
1. Review [STATUS.md](./STATUS.md) to understand current status
2. Follow [PGADMIN4-GUIDE.md](./PGADMIN4-GUIDE.md) for GUI-based installation
3. Verify installation success

### Alternative Approach (via Proxy)
1. Update proxy using [PROXY-UPDATE-GUIDE.md](./PROXY-UPDATE-GUIDE.md)
2. Follow [INSTALLATION.md](./INSTALLATION.md) for command-line installation

## 🎯 pgvector Features

- **Vector similarity search** - Cosine, L2, Inner Product distances
- **1536-dimension vectors** - Compatible with OpenAI embeddings
- **Index support** - IVFFlat for performance optimization
- **RAG integration** - Ready for Retrieval-Augmented Generation

## 📊 Current Status

- ✅ PostgreSQL 16.10 running (pgvector/pgvector:pg16 image)
- ✅ pgvector available in container
- ⏳ Extension creation pending (use pgAdmin4)

## 🔙 Navigation

- [← Back to Documentation](../README.md)
- [← Back to Project Root](../../README.md)
