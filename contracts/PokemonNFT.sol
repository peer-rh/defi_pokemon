//Import OpenZeppelin’s ERC721 Library
// SPDX-License-Identifier: MIT

//set the Solidity version
pragma solidity ^0.8.20;

//import the ERC721 contract
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

//allow to restrict access (only the contract owner can mint Pokémon)
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

//Define the Pokémon NFT contract

//This contract inherits ERC721 and Ownable. It creates NFTs that only the contract owner can mint.
//provide a counter for unique IDs (each Pokémon gets a unique number)
contract PokemonNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIds; // Counter for unique Pokémon IDs
    uint256 private _maxId; // Base ID for Pokémon

    uint256[] private _auctionsTokens; //counter for unique pokemond ids
    //A struct to store Pokémon details (name, type, level).
    struct Pokemon {
        uint256 baseIdx;
        uint256 level;
    }

    //A struct for the auction
    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool ended;
    }

    //A mapping to store metadata for each Pokémon.
    mapping(uint256 => Pokemon) private _pokemonData; // Maps token ID to Pokémon data
    mapping(uint256 => uint256) private _listings; // tokenId => fixed sale price in wei
    mapping(uint256 => Auction) public _auctions;


    event PokemonListed(
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );
    event PokemonSold(
        uint256 indexed tokenId,
        uint256 price,
        address indexed buyer
    );
    event AuctionStarted(uint256 indexed tokenId);
    event NewBid(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);

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
    ) public view returns (uint256, uint256, uint256,uint256,bool) {
        require(_exists(tokenId), "Pokemon does not exist"); // Check if the token exists
        Pokemon memory p = _pokemonData[tokenId];
        uint256 price = _listings[tokenId]; // Also starting price at bid
        Auction memory auction = _auctions[tokenId];
        bool isAuction = false;
        for(uint256 i = 0; i< _auctionsTokens.length;i++){
            if(_auctionsTokens[i] == tokenId){
                isAuction = true;
                break;
            }
        }
        return (p.baseIdx, p.level, price,auction.highestBid,isAuction);
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

    function getPlayerPokemons(
        address player
    ) external view returns (uint256[] memory) {
        uint256 count = balanceOf(player);
        uint256[] memory playerPokemons = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (ownerOf(i) == player) {
                playerPokemons[index] = i;
                index++;
            }
        }

        return playerPokemons;
    }

    /**
     * @notice Get all listed Pokémon IDs and their prices.
     * @return An array of token IDs and their corresponding prices.
     */
    function getListedPokemons()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        uint256 total = _tokenIds;
        uint256 count = 0;
        // First pass: count listed tokens
        for (uint256 i = 1; i <= total; i++) {
            if (_listings[i] > 0) {
                count++;
            }
        }
        // Initialize arrays with exact length
        uint256[] memory tokenIds = new uint256[](count);
        uint256[] memory prices = new uint256[](count);
        uint256 index = 0;
        // Second pass: populate arrays
        for (uint256 i = 1; i <= total; i++) {
            uint256 price = _listings[i];
            if (price > 0) {
                tokenIds[index] = i;
                prices[index] = price;
                index++;
            }
        }
        return (tokenIds, prices);
    }
    /**
     * @notice Get all listed Pokémon IDs and their auction struct.
     * @return An array of auction struct.
     */
    function getAuctionPokemon()
        external
        view
        returns (uint256[] memory, uint256[] memory, uint256[] memory,uint256[] memory)
    {
        uint256 length = _auctionsTokens.length;
        uint256[] memory tokenIds = new uint256[](length);
        uint256[] memory highestBid = new uint256[](length);
        uint256[] memory auctionEndTime = new uint256[](length);
        uint256[] memory startingBids = new uint256[](length);
        for(uint256 i = 0; i<length;i++){
            uint256 tokenId = _auctionsTokens[i];
            tokenIds[i] = _auctions[tokenId].tokenId; // idk why but need to add 1 here somewhere the tokenid gets -1
            highestBid[i] = _auctions[tokenId].highestBid;
            auctionEndTime[i] = _auctions[tokenId].endTime;
            startingBids[i] = _auctions[tokenId].startingPrice;
        }
        return (tokenIds,highestBid,auctionEndTime,startingBids);
    }

    /**
     * @notice List a Pokémon for sale at a fixed price.
     * @param tokenId The ID of the Pokémon to list.
     * @param price The sale price in wei.
     */
    function listPokemonForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than zero");
        _listings[tokenId] = price;
        emit PokemonListed(tokenId, price, msg.sender);
    }

    /**
     * @notice Cancel an existing listing.
     * @param tokenId The ID of the Pokémon listing to cancel.
     */
    function cancelListing(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(_listings[tokenId] > 0, "Not listed for sale");
        delete _listings[tokenId];
    }

    /**
     * @notice Purchase a listed Pokémon.
     * @param tokenId The ID of the Pokémon to buy.
     */
    function buyPokemon(uint256 tokenId) external payable nonReentrant {
        uint256 price = _listings[tokenId];
        require(price > 0, "Not for sale");
        require(msg.value >= price, "Insufficient payment");
        address seller = ownerOf(tokenId);
        // Effects
        delete _listings[tokenId];
        // Interaction
        _safeTransfer(seller, msg.sender, tokenId, "");
        (bool success, ) = payable(seller).call{value: price}("");
        require(success, "Payment to seller failed");
        // Refund excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - price
            }("");
            require(refundSuccess, "Refund failed");
        }
        emit PokemonSold(tokenId, price, msg.sender);
    }

    /**
     * @notice Get the current listing price of a Pokémon.
     * @param tokenId The ID of the Pokémon.
     * @return The listing price in wei.
     */
    function getListingPrice(uint256 tokenId) external view returns (uint256) {
        return _listings[tokenId];
    }

    function startAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    )  external
        returns (uint256) {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(_auctions[tokenId].endTime == 0, "Auction already exists");
        _listings[tokenId] = startingPrice;
        _auctionsTokens.push(tokenId);

        _auctions[tokenId] = Auction({
            seller: msg.sender,
            tokenId: tokenId,
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            ended: false
        });

        return tokenId;
    }

    function endAuction(uint256 tokenId) public {
        Auction storage auction = _auctions[tokenId];
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.ended, "Already ended");
        delete _auctions[tokenId];
        delete _listings[tokenId];
        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            payable(auction.seller).transfer(auction.highestBid);
            _transfer(address(this), auction.highestBidder, tokenId);
        } else {
            // No bids — return to seller
            _transfer(address(this), auction.seller, tokenId);
        }

        emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
    }

    function placeBid(uint256 tokenId) external payable {
        Auction storage auction = _auctions[tokenId];
        require(!auction.ended, Strings.toString(auction.endTime));
        require(block.timestamp < auction.endTime, "Auction ended");

        uint256 currentBid = auction.highestBid > 0 ? auction.highestBid : auction.startingPrice;
        require(msg.value > currentBid, "Bid too low ");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        // Update with new bid
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        emit NewBid(tokenId, msg.sender, msg.value);
    }
}
