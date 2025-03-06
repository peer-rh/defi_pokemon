# Defi Pokemon
## Getting Started
1. Set Up Blockchain 
    - Run `SEED_PHRASE=<MetaMask Secret Phrase> npx hardhat node` in one terminal window
    - Run `npx hardhat run scripts/deploy.js --network localhost`
    - This prints out 2 addresses, save these to `.env
    ```
    PUBLIC_NFT_CONTRACT_ADDRESS="..."
    PUBLIC_MARKETPLACE_CONTRACT_ADDRESS="..."
    ```
    - Setup MetaMask with new Custom Network; 
2. Go into frontend dir and run npm run dev
