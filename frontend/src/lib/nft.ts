import { toasts } from 'svelte-toasts';

import PokemonNFTABI from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
import { ethers, BrowserProvider } from 'ethers';
import { PUBLIC_NFT_CONTRACT_ADDRESS } from '$env/static/public';
import POKEMON_DATA from '$lib/pokemons.json';
import type { BigNumberish } from 'ethers';

export type PokemonNFT = {
    tokenId: number;
    baseIdx: number;
    level: number;
    name: string;
    description: string;
    imageURI: string;
    primaryType: string;
    secondaryType: string | null;
    attack: number;
    defense: number;
    listingPrice: string;
    isListed: boolean;
    owner: string; // Add owner field
    auction?: {
        highestBid: string;
        auctionEndTime: number;
        startingPrice: string;
        isHighestBidder: boolean;
        auctionEnded: boolean;
    }
}

export class NFTHandler {
    // @ts-ignore
    userAddress: string;
    // @ts-ignore
    contract: ethers.Contract;

    async init() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        this.userAddress = userAddress;

        // Create contract instance
        this.contract = new ethers.Contract(
            PUBLIC_NFT_CONTRACT_ADDRESS,
            PokemonNFTABI.abi,
            signer
        );
    }

    async mintPokemonNFT(baseIdx: number, level: number) {
        const transaction = await this.contract.mintPokemon(
            this.userAddress,
            baseIdx,
            level
        )
        const tx = await transaction.wait();
        return tx
    }

    async isPaused(){
        let isPaused = await this.contract.isPaused();
        return isPaused;
    }
    async togglePaused(){
        await this.contract.togglePause();
    }

    async fetchUserNFTs() {
        let userNFTs = [];
        let userTokens = await this.contract.getPlayerPokemons(this.userAddress);
        console.log("User Tokens", userTokens);

        for (let i of userTokens) {
            const details = await this.contract.getPokemonDetails(i);
            const priceWei = details[2]; // THis is also the starting price in auctions
            const listingPrice = ethers.formatEther(priceWei);
            const isListed = priceWei > 0n;
            const level = Number(details[1]);
            const baseIdx = Number(details[0])
            const pokeData = POKEMON_DATA[baseIdx] as any;
            const auctionHighestBid = ethers.formatEther(details[3]);
            const isAuction = details[4];
            const auction = !isAuction ? undefined : {
                highestBid: auctionHighestBid,
                auctionEndTime: "",
                startingPrice: 0,
                isHighestBidder: false,
                auctionEnded: false
            };

            userNFTs.push({
                tokenId: i,
                baseIdx,
                level,
                name: pokeData.english_name,
                description: pokeData.description,
                imageURI: "https://github.com/cristobalmitchell/pokedex/blob/main/images/small_images/" + pokeData.national_number.toString().padStart(3, '0') + ".png?raw=true",
                primaryType: pokeData.primary_type,
                secondaryType: pokeData.secondary_type,
                attack: pokeData.attack,
                defense: pokeData.defense,
                listingPrice: listingPrice,
                isListed: isListed,
                owner: this.userAddress, // Add owner field
                auction: auction
            });
        }
        return userNFTs;
    }

    async isAdmin() {
        if (!this.contract || !this.userAddress) {
            return false;
        }
        const isAdmin = await this.contract.isContractOwner();
        return isAdmin;
    }

    /**
     * List a Pokémon for sale at a fixed price (in ether).
     * @param tokenId The ID of the Pokémon to list.
     * @param priceInEther The sale price in ETH.
     */
    async listPokemonForSale(tokenId: number, priceInEther: string | number) {
        const price = ethers.parseEther(priceInEther.toString());
        const tx = await this.contract.listPokemonForSale(tokenId, price);
        await tx.wait();
        toasts.success(`Pokémon #${tokenId} listed for ${priceInEther} ETH`);
        return tx;
    }

    /**
     * List a Pokémon for auction at a starting price (in ether).
     * @param tokenId The ID of the Pokémon to list.
     * @param priceInEther The sale price in ETH.
     */
    async auctionPokemonForSale(tokenId: number, priceInEther: string | number, timeInSeconds: number) {
        const price = ethers.parseEther(priceInEther.toString());
        const tx = await this.contract.startAuction(tokenId, price, timeInSeconds);
        await tx.wait();
        toasts.success(`Pokémon #${tokenId} listed for ${priceInEther} ETH`);
        return tx;
    }

    async placeBid(tokenId: number, priceInEther: string | number) {
        const price = ethers.parseEther(priceInEther.toString());
        const tx = await this.contract.placeBid(tokenId, {
            value: price,
        });
        await tx.wait();
        toasts.success(`Bid on Pokemon #${tokenId} with ${priceInEther} ETH`);
    }

    /**
     * End an existing auction.
     * @param tokenId The ID of the Pokémon listing to cancel.
     */
    async endAuction(tokenId: number) {
        const tx = await this.contract.endAuction(tokenId);
        await tx.wait();
        toasts.success(`Auction for Pokémon #${tokenId} canceled`);
        return tx;
    }

    /**
     * Cancel an existing listing.
     * @param tokenId The ID of the Pokémon listing to cancel.
     */
    async cancelListing(tokenId: number) {
        const tx = await this.contract.cancelListing(tokenId);
        await tx.wait();
        toasts.success(`Listing for Pokémon #${tokenId} canceled`);
        return tx;
    }

    /**
     * Purchase a listed Pokémon by paying the fixed price.
     * @param tokenId The ID of the Pokémon to buy.
     * @param priceInEther The purchase price in ETH.
     */
    async buyPokemon(tokenId: number, priceInEther: string | number) {
        const price = ethers.parseEther(priceInEther.toString());
        const tx = await this.contract.buyPokemon(tokenId, { value: price });
        await tx.wait();
        toasts.success(`Pokémon #${tokenId} purchased for ${priceInEther} ETH`);
        return tx;
    }

    /**
     * Get the current listing price of a Pokémon.
     * @param tokenId The ID of the Pokémon.
     * @returns The listing price in wei as a string.
     */
    async getListingPrice(tokenId: number): Promise<string> {
        const priceWei: ethers.BigNumberish = await this.contract.getListingPrice(tokenId);
        return priceWei.toString();
    }

    /**
     * Retrieve all listed Pokémon with their prices and owners.
     * @returns Array of objects with tokenId, price in ETH, and owner address.
     */
    async getAllListedPokemons(): Promise<PokemonNFT[]> {
        const [tokenIds, prices] = await this.contract.getListedPokemons();
        const [auctionTokenIds, highestBids, auctionEndTime, startingBid, highestBidderAddress, auctionEnded] = await this.contract.getAuctionPokemon();
        const listedPokemons: PokemonNFT[] = [];
        const uniqueIds = Array.from(new Set([...tokenIds, ...auctionTokenIds]));

        for (let i = 0; i < uniqueIds.length; i++) {
            const tokenId = uniqueIds[i];
            const owner = await this.contract.ownerOf(tokenId); // Fetch owner
            const details = await this.contract.getPokemonDetails(tokenId);
            const level = Number(details[1]);
            const baseIdx = Number(details[0]);
            const pokeData = POKEMON_DATA[baseIdx] as any;
            const isListed = true;
            let auction = undefined;

            for (let j = 0; j < auctionTokenIds.length; j++) {
                if (auctionTokenIds[j] == tokenId) {
                    auction = {
                        highestBid: ethers.formatEther(highestBids[j]),
                        auctionEndTime: auctionEndTime[j],
                        startingPrice: ethers.formatEther(startingBid[j]),
                        isHighestBidder: this.userAddress.toLowerCase() === highestBidderAddress[j].toLowerCase(),
                        auctionEnded: auctionEnded[j]
                    }
                    break;
                }
            }
            let listingPrice = ethers.formatEther(0);
            try {
                listingPrice = ethers.formatEther(prices[i] ?? ethers.toBigInt(0));
            } catch { }

            listedPokemons.push({
                tokenId,
                baseIdx,
                level,
                name: pokeData.english_name,
                description: pokeData.description,
                imageURI: "https://github.com/cristobalmitchell/pokedex/blob/main/images/small_images/" + pokeData.national_number.toString().padStart(3, '0') + ".png?raw=true",
                primaryType: pokeData.primary_type,
                secondaryType: pokeData.secondary_type,
                attack: pokeData.attack,
                defense: pokeData.defense,
                listingPrice,
                isListed,
                owner, // Include owner
                auction: auction
            });
        }
        return listedPokemons;
    }
}