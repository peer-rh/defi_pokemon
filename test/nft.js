const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonNFT", function () {
  const MAX_POKEMON_ID = 20; // Max base ID for Pokémon types
  const TEST_POKEMON_BASE_IDX = 1;
  const TEST_POKEMON_LEVEL = 5;
  const ONE_ETHER = ethers.parseEther("1");
  const POINT_ONE_ETHER = ethers.parseEther("0.1");
  const POINT_TWO_ETHER = ethers.parseEther("0.2");
  const AUCTION_DURATION_SECONDS = 60 * 60; // 1 hour

  async function deployPokemonNFTFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2] = await ethers.getSigners();

    const PokemonNFTFactory = await ethers.getContractFactory("PokemonNFT");
    const pokemonNFT = await PokemonNFTFactory.deploy(MAX_POKEMON_ID);
    await pokemonNFT.waitForDeployment();

    return { pokemonNFT, owner, account1, account2, maxId: MAX_POKEMON_ID };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { pokemonNFT, owner } = await loadFixture(deployPokemonNFTFixture);
      expect(await pokemonNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      const { pokemonNFT } = await loadFixture(deployPokemonNFTFixture);
      expect(await pokemonNFT.name()).to.equal("PokemonNFT");
      expect(await pokemonNFT.symbol()).to.equal("PKMN");
    });

    it("Should set the correct maxId", async function () {
      // Destructure 'owner' here
      const { pokemonNFT, owner, maxId } = await loadFixture(deployPokemonNFTFixture);
      // Note: _maxId is private, so we test its effect (e.g., in minting)
      // For direct testing, you might need an internal getter or test via minting.
      // Here, we'll assume its correct functioning will be validated by minting tests.
      // A direct way if _maxId were public: expect(await pokemonNFT._maxId()).to.equal(maxId);
      // For now, we'll check its usage in minting.
      await expect(
        pokemonNFT.connect(owner).mintPokemon(owner.address, maxId, TEST_POKEMON_LEVEL) // Use connect(owner) if mintPokemon is Ownable
      ).to.be.revertedWith("Invalid base index");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint a Pokemon", async function () {
      const { pokemonNFT, owner, account1 } = await loadFixture(
        deployPokemonNFTFixture
      );
      await expect(
        pokemonNFT
          .connect(owner)
          .mintPokemon(
            account1.address,
            TEST_POKEMON_BASE_IDX,
            TEST_POKEMON_LEVEL
          )
      )
        .to.emit(pokemonNFT, "Transfer")
        .withArgs(ethers.ZeroAddress, account1.address, 1); // tokenId 1

      expect(await pokemonNFT.ownerOf(1)).to.equal(account1.address);
      const details = await pokemonNFT.getPokemonDetails(1);
      expect(details[0]).to.equal(TEST_POKEMON_BASE_IDX); // baseIdx
      expect(details[1]).to.equal(TEST_POKEMON_LEVEL); // level
    });

    it("Should not allow non-owner to mint a Pokemon", async function () {
      const { pokemonNFT, account1 } = await loadFixture(
        deployPokemonNFTFixture
      );
      await expect(
        pokemonNFT
          .connect(account1)
          .mintPokemon(
            account1.address,
            TEST_POKEMON_BASE_IDX,
            TEST_POKEMON_LEVEL
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert if minting with invalid baseIdx", async function () {
      const { pokemonNFT, owner, maxId } = await loadFixture(
        deployPokemonNFTFixture
      );
      await expect(
        pokemonNFT
          .connect(owner)
          .mintPokemon(owner.address, maxId, TEST_POKEMON_LEVEL)
      ).to.be.revertedWith("Invalid base index");
      await expect(
        pokemonNFT
          .connect(owner)
          .mintPokemon(owner.address, maxId + 1, TEST_POKEMON_LEVEL)
      ).to.be.revertedWith("Invalid base index");
    });

    it("Should increment token IDs", async function () {
      const { pokemonNFT, owner, account1 } = await loadFixture(
        deployPokemonNFTFixture
      );
      await pokemonNFT
        .connect(owner)
        .mintPokemon(
          account1.address,
          TEST_POKEMON_BASE_IDX,
          TEST_POKEMON_LEVEL
        ); // Token ID 1
      await expect(
        pokemonNFT
          .connect(owner)
          .mintPokemon(
            account1.address,
            TEST_POKEMON_BASE_IDX + 1,
            TEST_POKEMON_LEVEL + 1
          )
      )
        .to.emit(pokemonNFT, "Transfer")
        .withArgs(ethers.ZeroAddress, account1.address, 2); // Token ID 2
      expect(await pokemonNFT.ownerOf(2)).to.equal(account1.address);
    });
  });

  describe("Fixed Price Sales", function () {
    let fixture;
    const tokenId = 1;

    beforeEach(async function () {
      fixture = await loadFixture(deployPokemonNFTFixture);
      const { pokemonNFT, owner, account1 } = fixture;
      await pokemonNFT
        .connect(owner)
        .mintPokemon(
          account1.address,
          TEST_POKEMON_BASE_IDX,
          TEST_POKEMON_LEVEL
        );
    });

    it("Should allow owner to list a Pokemon for sale", async function () {
      const { pokemonNFT, account1 } = fixture;
      await expect(
        pokemonNFT.connect(account1).listPokemonForSale(tokenId, ONE_ETHER)
      )
        .to.emit(pokemonNFT, "PokemonListed")
        .withArgs(tokenId, ONE_ETHER, account1.address);
      expect(await pokemonNFT.getListingPrice(tokenId)).to.equal(ONE_ETHER);
    });

    it("Should not allow non-owner to list a Pokemon", async function () {
      const { pokemonNFT, account2 } = fixture;
      await expect(
        pokemonNFT.connect(account2).listPokemonForSale(tokenId, ONE_ETHER)
      ).to.be.revertedWith("Not the owner");
    });

    it("Should allow cancelling a listing", async function () {
      const { pokemonNFT, account1 } = fixture;
      await pokemonNFT.connect(account1).listPokemonForSale(tokenId, ONE_ETHER);
      await expect(pokemonNFT.connect(account1).cancelListing(tokenId))
        .to.not.be.reverted;
      expect(await pokemonNFT.getListingPrice(tokenId)).to.equal(0);
    });

    it("Should allow buying a listed Pokemon", async function () {
      const { pokemonNFT, account1, account2 } = fixture;
      await pokemonNFT.connect(account1).listPokemonForSale(tokenId, ONE_ETHER);

      await expect(
        pokemonNFT.connect(account2).buyPokemon(tokenId, { value: ONE_ETHER })
      )
        .to.emit(pokemonNFT, "PokemonSold")
        .withArgs(tokenId, ONE_ETHER, account2.address);

      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(account2.address);
      expect(await pokemonNFT.getListingPrice(tokenId)).to.equal(0); // Listing removed
    });

    it("Should refund excess payment when buying", async function () {
      const { pokemonNFT, account1, account2 } = fixture;
      await pokemonNFT.connect(account1).listPokemonForSale(tokenId, ONE_ETHER);
      const higherPayment = ethers.parseEther("1.5");

      await expect(
        pokemonNFT.connect(account2).buyPokemon(tokenId, { value: higherPayment })
      ).to.changeEtherBalances(
        [account1, account2],
        [ONE_ETHER, -ONE_ETHER] // account2 pays 1 ETH effectively after refund
      );
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(account2.address);
    });

    it("Should fail to buy if insufficient payment", async function () {
      const { pokemonNFT, account1, account2 } = fixture;
      await pokemonNFT.connect(account1).listPokemonForSale(tokenId, ONE_ETHER);
      await expect(
        pokemonNFT.connect(account2).buyPokemon(tokenId, { value: POINT_ONE_ETHER })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Auctions", function () {
    let fixture;
    const tokenId = 1;

    beforeEach(async function () {
      fixture = await loadFixture(deployPokemonNFTFixture);
      const { pokemonNFT, owner, account1 } = fixture;
      // Mint a token to account1 who will be the seller
      await pokemonNFT
        .connect(owner)
        .mintPokemon(
          account1.address,
          TEST_POKEMON_BASE_IDX,
          TEST_POKEMON_LEVEL
        );
    });

    it("Should allow owner to start an auction", async function () {
      const { pokemonNFT, account1 } = fixture;
      await expect(
        pokemonNFT
          .connect(account1)
          .startAuction(tokenId, POINT_ONE_ETHER, AUCTION_DURATION_SECONDS)
      ).to.not.be.reverted; // The contract doesn't emit AuctionStarted, so we can't check for it directly.
      // If it did, it would be: .to.emit(pokemonNFT, "AuctionStarted").withArgs(tokenId);

      const auction = await pokemonNFT._auctions(tokenId);
      expect(auction.seller).to.equal(account1.address);
      expect(auction.startingPrice).to.equal(POINT_ONE_ETHER);
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(await pokemonNFT.getAddress()); // Contract holds the NFT
    });

    it("Should allow placing a bid", async function () {
      const { pokemonNFT, account1, account2 } = fixture;
      await pokemonNFT
        .connect(account1)
        .startAuction(tokenId, POINT_ONE_ETHER, AUCTION_DURATION_SECONDS);

      await expect(
        pokemonNFT.connect(account2).placeBid(tokenId, { value: POINT_TWO_ETHER })
      )
        .to.emit(pokemonNFT, "NewBid")
        .withArgs(tokenId, account2.address, POINT_TWO_ETHER);

      const auction = await pokemonNFT._auctions(tokenId);
      expect(auction.highestBidder).to.equal(account2.address);
      expect(auction.highestBid).to.equal(POINT_TWO_ETHER);
    });

    it("Should refund previous bidder when a higher bid is placed", async function () {
      const { pokemonNFT, account1, account2, owner: account3 } = fixture; // Using owner as account3 for simplicity
      await pokemonNFT.connect(account1).startAuction(tokenId, POINT_ONE_ETHER, AUCTION_DURATION_SECONDS);

      // Account2 places first bid
      await pokemonNFT.connect(account2).placeBid(tokenId, { value: POINT_TWO_ETHER });
      const bid2Amount = POINT_TWO_ETHER;

      // Account3 places higher bid
      const bid3Amount = ethers.parseEther("0.3");
      await expect(pokemonNFT.connect(account3).placeBid(tokenId, { value: bid3Amount }))
        .to.changeEtherBalances([account2, pokemonNFT], [bid2Amount, bid3Amount - bid2Amount]);

      const auction = await pokemonNFT._auctions(tokenId);
      expect(auction.highestBidder).to.equal(account3.address);
      expect(auction.highestBid).to.equal(bid3Amount);
    });

    it("Should return NFT to seller if no bids when auction ends", async function () {
      const { pokemonNFT, account1 } = fixture;
      await pokemonNFT.connect(account1).startAuction(tokenId, POINT_ONE_ETHER, AUCTION_DURATION_SECONDS);

      await time.increase(AUCTION_DURATION_SECONDS + 1);

      await expect(pokemonNFT.connect(account1).endAuction(tokenId))
        .to.emit(pokemonNFT, "AuctionEnded")
        .withArgs(tokenId, ethers.ZeroAddress, 0); // No winner, no amount

      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(account1.address); // NFT returned to seller
      const auction = await pokemonNFT._auctions(tokenId);
      expect(auction.seller).to.equal(ethers.ZeroAddress); // Auction struct cleared
    });


    it("Should not allow ending an auction before duration", async function () {
      const { pokemonNFT, account1, account2 } = fixture;
      await pokemonNFT.connect(account1).startAuction(tokenId, POINT_ONE_ETHER, AUCTION_DURATION_SECONDS);
      await pokemonNFT.connect(account2).placeBid(tokenId, { value: POINT_TWO_ETHER });

      await expect(pokemonNFT.connect(account1).endAuction(tokenId))
        .to.be.revertedWith("Auction not ended");
    });
  });
});
