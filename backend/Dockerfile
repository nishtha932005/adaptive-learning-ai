FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Environment settings for production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (including student_progress_model.pkl) into the image
COPY . .

# Expose the application port
EXPOSE 8080

# Start FastAPI via the module entrypoint
CMD ["python", "-m", "app.main"]
