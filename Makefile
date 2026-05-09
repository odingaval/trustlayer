# TrustLayer Dev Workflows
# Usage: make <target>

.PHONY: test frontend validator clean-ledger

# Run Anchor contract tests (no browser/Vite needed)
test:
	@echo "🧪 Running contract tests (headless)..."
	anchor test

# Start validator with low memory footprint
validator:
	@echo "⛓  Starting validator (memory-optimized)..."
	solana-test-validator \
		--limit-ledger-size 50000000 \
		--ledger .anchor/test-ledger \
		--reset

# Start frontend dev server only
dev:
	@echo "🌐 Starting Vite dev server..."
	cd app && npm run dev

# Start validator + Vite together (close Firefox tabs you don't need first!)
frontend: 
	@echo "⚠️  Close any unused Firefox tabs before continuing."
	@echo "Starting validator (memory-optimized) + Vite..."
	solana-test-validator \
		--limit-ledger-size 50000000 \
		--ledger .anchor/test-ledger \
		--reset &
	sleep 3
	cd app && npm run dev

# Clean up ledger data to free disk space
clean-ledger:
	@echo "🧹 Cleaning ledger..."
	rm -rf .anchor/test-ledger

# Kill all dev processes
stop:
	@echo "🛑 Stopping all dev processes..."
	pkill -f "solana-test-validator" || true
	pkill -f "vite" || true
	@echo "Done."
