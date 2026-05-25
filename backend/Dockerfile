FROM python:3.12-slim

WORKDIR /app

# libusb: runtime do python-escpos (impressora térmica USB)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libusb-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Produção: sem --reload. Concorrência é resolvida pelo event loop async.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
