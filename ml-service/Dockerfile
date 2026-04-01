FROM python:3.11-slim

WORKDIR /app

# Install system deps for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download FinBERT weights into the image so the first request on Azure
# does not time out pulling weights from Hugging Face. If this step fails the
# build fails, making the problem visible instead of silently falling back to
# TextBlob at runtime.
RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
    AutoTokenizer.from_pretrained('ProsusAI/finbert'); \
    AutoModelForSequenceClassification.from_pretrained('ProsusAI/finbert')"

# Copy all service files
COPY *.py .

ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

CMD ["python", "app.py"]
