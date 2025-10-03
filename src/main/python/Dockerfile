FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY postgres_proxy.py .

# Environment variables (override these at runtime)
ENV POSTGRES_HOST=192.168.1.114
ENV POSTGRES_PORT=5532
ENV POSTGRES_DB=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=Morris1230
ENV PROXY_API_KEY=your-secure-api-key-here

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "postgres_proxy:app", "--host", "0.0.0.0", "--port", "8000"]
