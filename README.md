# Rust DNS Frontend

The modern Web UI for the `rust-dns-backend` enterprise DNS server. Built with React, TypeScript, and Vite.

## Features
- **Modern UI**: Clean and intuitive dashboard for DNS management.
- **Fast Development**: Powered by Vite for instant HMR.
- **Strict Typing**: Comprehensive TypeScript configuration for type safety.
- **Automated Validation**: Integrated ESLint, Prettier, and GitHub Actions for continuous quality.

## Getting Started

### Prerequisites
- Node.js (v20 or newer recommended)
- npm or pnpm or yarn

### Installation
```bash
npm install
# or
yarn install
```

### Running Locally (Development)
Starts the development server on `http://localhost:5173`. Make sure `rust-dns-backend` is also running to proxy API requests if needed.

```bash
npm run dev
```

### Building for Production
Create an optimized build in the `dist` directory:
```bash
npm run build
```

## Docker Deployment
We provide a multi-stage Dockerfile that builds the static project and serves it through a lightweight Nginx web server.

```bash
docker build -t rust-dns-frontend .
docker run -d -p 80:80 rust-dns-frontend
```

Ensure your API backend is correctly exposed and consider modifying `/etc/nginx/conf.d/default.conf` to proxy API requests correctly inside the container if it sits behind the same ingress.

## QA & Testing
This project integrates into CI through `.github/workflows`. On every pull request or commit to the main branch, it performs the following checks:
- **Linting**: `npm run lint` ensures code cleanliness and standards consistency.
- **Type Checking**: `tsc --noEmit` validates proper typing.
- **Security Audits**: `npm audit` prevents bringing known vulnerabilities into the system.
- **Build Checks**: Prevents merging code that does not build properly.
