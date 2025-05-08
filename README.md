# Defi Pokemon
A decentralized marketplace for trading Pokémon NFTs using Ethereum smart contracts. Supports fixed-price listings and live auctions with real-time bidding updates.
## Features
- Buy and sell Pokémon NFTs
- List NFTs for **fixed price** or **auction**
- Real-time **auction countdowns**
- Bidding system with **highest bidder recognition**
- Ethereum smart contract backend (Solidity + Hardhat)
- Beautiful UI 

## Getting Started
1. clone the repository
2. Install npm packages in main and in frontend
3. Copy run.template.sh and set your SEED_PHRASE from MetaMask 
4. Run run.sh (might have to run `chmod +x run.sh` first)

##Documentation
###After setting

## NFTs
### PokemonNFT:
- Fields: 
    - `[index]: int`
    - `baseIdx: int` is the idx of the pokemon in `pokemons.json` (`0 <= baseIdx < len(pokemons)`)
    - `level: int` is the level of the pokemon
- Methods:
    - `mintPokemon(baseIdx, lvl)` can only be called by the owner of the Contract and creates a new PokemonNFT
    - `getPokemonDetails(id)` returns the baseIdx & level of the pokemon based on the tokenIdx; Note that everybody can call this function
    - `transferPokemon(to, id)` should be called by the owner of the NFT to transfer the pokemon to the new Owner

### PokemonMarket 
- Fields: 
    - `[index]: int` is the pokemonNFTindex
    - `isAuction: boolean`
    - `currentPrice: int` 
    - `highestBidder: int`
    - `dateCreated: time`
    - `auctionLength: time`

## Credits
- https://github.com/cristobalmitchell/pokedex for pokemon data