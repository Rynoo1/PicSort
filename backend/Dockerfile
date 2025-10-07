# Stage 1: Build
FROM golang:1.25.1-alpine AS builder

# Set environment variables
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# Set working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum first (for caching dependencies)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the binary
RUN go build -o picsort .

# Stage 2: Minimal runtime image
FROM alpine:latest

# Set working directory inside container
WORKDIR /root/

# Copy the built binary from the builder stage
COPY --from=builder /app/picsort .

# Expose port if your app uses it
EXPOSE 8080

# Run the binary
CMD ["./picsort"]
