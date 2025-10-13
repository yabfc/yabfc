# Yet Another Beautiful Factory Calculator

## Run the Application with Docker

1. Get yourself a copy of the `compose.yaml`
   ```bash
   curl -O https://raw.githubusercontent.com/yabfc/yabfc/main/compose.yaml
   ```
2. Start the service
   ```bash
   docker compose up -d
   ```

> [!NOTE]
>
> If you prefer to build the image yourself, run the following command prior to starting the service.
>
> ```bash
> docker compose build
> ```

## Development Setup

Install [Node.js LTS](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs) and [pnpm](https://pnpm.io/installation)

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Format code
pnpm format

# Run checks
pnpm check

# Build project
pnpm build
```
