@help:
	just --list

# Generate the json schema from the typescript models
gen-schema:
    rm profiles/schema.json
    pnpm dlx ts-json-schema-generator --type ProfileInterface -e none -p src/lib/models/profile.ts >> profiles/schema.json
    pnpm prettier profiles/schema.json -w
