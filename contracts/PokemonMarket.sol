// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

//Security features:
//nonReentrant to prevent reentrancy attacks

contract PokemonMarket is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
        bool isAuction;
        address highestBidder;
        uint256 highestBid;
        uint256 auctionEndTime;
    }

    IERC721 public pokemonNFT;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public pendingReturns;

    event PokemonListed(uint256 indexed tokenId, address seller, uint256 price);
    event PokemonDelisted(uint256 indexed tokenId);
    event PokemonSold(uint256 indexed tokenId, address buyer, uint256 price);
    event PokemonAuctionCreated(
        uint256 indexed tokenId,
        address seller,
        uint256 startingBid,
        uint256 auctionEndTime
    );

    constructor(address _pokemonNFT) {
        pokemonNFT = IERC721(_pokemonNFT);
    }

    //Allow users to list a Pokémon for sale:
    function listPokemon(uint256 tokenId, uint256 price) external nonReentrant {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than zero");

        pokemonNFT.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true,
            isAuction: false,
            highestBidder: address(0),
            highestBid: 0,
            auctionEndTime: 0
        });

        emit PokemonListed(tokenId, msg.sender, price);
    }

    //Let the seller cancel their listing:
    function delistPokemon(uint256 tokenId) external nonReentrant {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(listings[tokenId].isActive, "Not listed");
        require(!listings[tokenId].isAuction, "Not a direct sale listing");

        listings[tokenId].isActive = false;
        pokemonNFT.transferFrom(address(this), msg.sender, tokenId);

        emit PokemonDelisted(tokenId);
    }

    //Allow a buyer to purchase a listed Pokémon
    function buyPokemon(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Not for sale");
        require(!listing.isAuction, "Use auction functions");
        require(msg.value >= listing.price, "Insufficient payment");

        listings[tokenId].isActive = false;
        payable(listing.seller).transfer(listing.price);
        pokemonNFT.transferFrom(address(this), msg.sender, tokenId);

        emit PokemonSold(tokenId, msg.sender, listing.price);
    }

    function createAuction(
        uint256 tokenId,
        uint256 startingBid,
        uint256 duration
    ) external nonReentrant {
        require(!listings[tokenId].isActive, "Already listed");
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(startingBid > 0, "Starting bid must be positive");
        pokemonNFT.transferFrom(msg.sender, address(this), tokenId);
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: startingBid,
            isActive: true,
            isAuction: true,
            highestBidder: address(0),
            highestBid: startingBid,
            auctionEndTime: block.timestamp + duration
        });
        emit PokemonAuctionCreated(
            tokenId,
            msg.sender,
            startingBid,
            block.timestamp + duration
        );
    }

    function bid(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.isActive && listing.isAuction, "No active auction");
        require(block.timestamp < listing.auctionEndTime, "Auction ended");
        require(msg.value > listing.highestBid, "Bid too low");
        if (listing.highestBidder != address(0)) {
            pendingReturns[listing.highestBidder] += listing.highestBid;
        }
        listing.highestBid = msg.value;
        listing.highestBidder = msg.sender;
    }

    function withdrawReturns() external {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No returns available");
        pendingReturns[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function endAuction(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.isActive && listing.isAuction, "No active auction");
        require(
            block.timestamp >= listing.auctionEndTime,
            "Auction not yet ended"
        );
        listing.isActive = false;
        uint256 winningBid = listing.highestBid;
        address winner = listing.highestBidder;
        address seller = listing.seller;
        pokemonNFT.transferFrom(address(this), winner, tokenId);
        payable(seller).transfer(winningBid);
        emit PokemonSold(tokenId, winner, winningBid);
    }
}
