//Import OpenZeppelin’s ERC721 Library
// SPDX-License-Identifier: MIT

//set the Solidity version
pragma solidity ^0.8.20;

//import the ERC721 contract
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

//allow to restrict access (only the contract owner can mint Pokémon)
import "@openzeppelin/contracts/access/Ownable.sol";

//Define the Pokémon NFT contract

//This contract inherits ERC721 and Ownable. It creates NFTs that only the contract owner can mint.
//provide a counter for unique IDs (each Pokémon gets a unique number)
contract PokemonNFT is ERC721, Ownable {
    uint256 private _tokenIds; // Counter for unique Pokémon IDs
    uint256 private _maxId; // Base ID for Pokémon

    //A struct to store Pokémon details (name, type, level).
    struct Pokemon {
        uint256 baseIdx;
        uint256 level;
    }

    //A mapping to store metadata for each Pokémon.
    mapping(uint256 => Pokemon) private _pokemonData; // Maps token ID to Pokémon data

    //Initializes the NFT contract with the name "PokemonNFT" and symbol "PKMN".
    constructor(uint256 maxId_) ERC721("PokemonNFT", "PKMN") Ownable() {
        _maxId = maxId_;
    }

    //A function to mint Pokémon NFTs. Only the contract owner can call it.
    function mintPokemon(
        address player,
        uint256 baseIdx,
        uint256 level
    ) public onlyOwner returns (uint256) {
        _tokenIds += 1; // Manual counter instead of Counters.sol
        uint256 newPokemonId = _tokenIds;

        require(baseIdx < _maxId, "Invalid base index");
        _mint(player, newPokemonId);
        _pokemonData[newPokemonId] = Pokemon(baseIdx, level);

        return newPokemonId;
    }

    //A function to retrieve Pokémon data using its ID.
    function getPokemonDetails(
        uint256 tokenId
    ) public view returns (uint256, uint256) {
        require(_exists(tokenId), "Pokemon does not exist"); // Check if the token exists
        Pokemon memory p = _pokemonData[tokenId];
        return (p.baseIdx, p.level);
    }

    function getOwner(uint256 tokenId) external view returns (address) {
        require(_exists(tokenId), "Pokemon does not exist");
        return ownerOf(tokenId);
    }

    //A function to trasnfer Pokemon between users
    function transferPokemon(address to, uint256 tokenId) public {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of this Pokemon"
        );
        safeTransferFrom(msg.sender, to, tokenId);
    }

    function isContractOwner() external view returns (bool) {
        return msg.sender == owner();
    }
}
