# 1. Set the Seed Phrase # (https://docs.metamask.io/wallet/how-to/run-devnet/)
export SEED_PHRASE=""

# 2. Start the HardHat node
echo "Starting Hardhat node in the background..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat node started with PID: $HARDHAT_PID"

# Give the node a moment to initialize
sleep 8

# 3. Deploy the contracts
echo "Deploying contracts..."
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network localhosnpx hardhat run scripts/deploy.js --network localhostt)

# Extract addresses from the deployment output
# Assuming the deploy script prints addresses in format "ContractName deployed to: 0x..."
echo "Extracting addresses..."
if [[ $DEPLOY_OUTPUT =~ PokemonNFT\ deployed\ to:\ (0x[a-fA-F0-9]+) ]]; then
    PUBLIC_NFT_CONTRACT_ADDRESS="${BASH_REMATCH[1]}"
    echo "PUBLIC_NFT_CONTRACT_ADDRESS: $PUBLIC_NFT_CONTRACT_ADDRESS"
    export PUBLIC_NFT_CONTRACT_ADDRESS
fi

echo "Deploying contracts completed."

cd frontend
npm run dev

# 4. Stop the HardHat node
echo "Stopping Hardhat node..."
pkill -f "$HARDHAT_PID"

