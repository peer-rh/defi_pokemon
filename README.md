# Defi Pokemon
## Getting Started
1. Install npm packages in main and in frontend
2. Copy run.template.sh and set SEED_PHRASE
3. Run run.sh (might have to run `chmod +x run.sh` first)

## Website (TODO)
- [ ] Falls Owner vom NFT Section mit mint NFT; Dort kann er:
    - Dropdown: Pokemon Name, basierend auf pokemons.json
    - Feld: Level Int parse
    - Button: Mint
- [ ] Section: Owned Pokemons
    - Liste mit den Pokemons in Besitz, Angezeift soll nur Bild, Name und Lvl. Bei Klick soll Pop Up mit mehr Stats Und einen Knopf "Sell" und "Auction"
    - Sell kommt Dialog mit "Preis"
    - Auction setzt den dann auf den Markt
- [ ] Section: Marketplace
    - Zeigt alle Angebote; Normaler Weise nur Bild, Name, Level und Preis. Bei Klick drauf kommt ein Pop Up, wo user mehr Info sieht, von wem er kauft und Option zu bieten / zu kaufen

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
    - TODO: Get Owner
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