# Yet Another Beautiful Factory Calculator

## How can I create / modify a profile?

- Generate a Satisfactory Profile with [satisfactory-profile-generator](https://github.com/yabfc/satisfactory-profile-generator)
- Generate a Factorio Profile from a dump with [factorio-profile-generator](https://github.com/yabfc/factorio-profile-generator)
- Grab a profile from this folder [this repo](profiles/)

Then you can add Items / Recipes / Machines / Effects or general Settings like the default Duration. Once you got your new profile ready, you can upload it in your settings.

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

Install:

- [Node.js LTS](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
- [pnpm](https://pnpm.io/installation)
- [prek](https://github.com/j178/prek)

for pre-commit-hooks (the python pre-commit-hook runner should be compatible as well)
To install the pre-commit-hooks run:

```bash
prek install
```

(does not need external dependencies besides pnpm which needs to be installed either way)

### Basic Commands

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
