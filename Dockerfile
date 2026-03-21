FROM node:18-alpine

# Accept proxy build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy

# Set proxy environment variables if provided
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy}

# Install OpenSSL for Prisma compatibility (use HTTP repos to bypass proxy SSL issues)
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.18/main" > /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/v3.18/community" >> /etc/apk/repositories && \
    apk add --no-cache openssl1.1-compat-dev || apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm for proxy (disable SSL if proxy is set)
RUN if [ -n "$HTTP_PROXY" ]; then \
        npm config set proxy $HTTP_PROXY && \
        npm config set https-proxy $HTTPS_PROXY && \
        npm config set strict-ssl false; \
    fi

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Generate Prisma client (conditionally disable SSL verification if proxy is set)
RUN if [ -n "$HTTP_PROXY" ]; then \
        NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate; \
    else \
        npx prisma generate; \
    fi

# Build Next.js app (conditionally disable SSL verification if proxy is set)
RUN if [ -n "$HTTP_PROXY" ]; then \
        NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build; \
    else \
        npm run build; \
    fi

# Make entrypoint executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
