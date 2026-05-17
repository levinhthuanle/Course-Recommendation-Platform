# Dockerfile - Application only (fast rebuild!)
# Uses pre-built dependencies image

FROM course-backend-deps:latest

WORKDIR /app

# Ensure PostgreSQL driver is present even if the base image was built from cache.
RUN pip install --no-cache-dir psycopg2-binary

# Copy application code only
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
