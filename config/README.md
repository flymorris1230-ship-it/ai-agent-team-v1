# ⚙️ Configuration Files

Configuration files for Docker, Proxy, and environment setup.

## 📂 Directory Structure

### [docker/](./docker/) - Docker Configuration
Docker Compose and Dockerfile configurations.
- **docker-compose.proxy.yml** - Proxy service composition
- **Dockerfile.proxy** - Proxy container image

### [proxy/](./proxy/) - Proxy Configuration
PostgreSQL HTTP Proxy configuration files.
- **nas-postgres-proxy.py** - Proxy server implementation
- **nas-proxy.env** - Proxy environment variables

### [examples/](./examples/) - Example Configurations
Template configuration files.
- **.env.example** - Environment variables template

## 🔧 Usage

### Docker Setup
```bash
cd config/docker
docker-compose -f docker-compose.proxy.yml up -d
```

### Proxy Configuration
1. Copy environment template:
   ```bash
   cp config/examples/.env.example .env
   ```

2. Update proxy settings in `config/proxy/nas-proxy.env`

3. Deploy proxy:
   ```bash
   python3 config/proxy/nas-postgres-proxy.py
   ```

## 🔐 Security Notes

- **Never commit** `.env` files with real credentials
- Always use `.env.example` as template
- Keep API keys and passwords secure
- Use environment variables for sensitive data

## 🔙 Navigation

- [← Back to Project Root](../README.md)
