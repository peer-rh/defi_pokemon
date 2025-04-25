import detectEthereumProvider from '@metamask/detect-provider';

import { toasts } from 'svelte-toasts';

import PokemonNFTABI from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
import PokemonMarketABI from '../../../artifacts/contracts/PokemonMarket.sol/PokemonMarket.json';
import { ethers, BrowserProvider, formatEther } from 'ethers';

/**
 * Checks if MetaMask is available and connects to it
 * @returns The Ethereum provider if available and connected, null otherwise
 */
export async function connectMetaMask() {
    try {
        console.log(PokemonNFTABI)
        // Check if MetaMask is installed
        const provider = await detectEthereumProvider();

        if (!provider) {
            toasts.add({
                title: 'MetaMask not found',
                description: 'Please install MetaMask browser extension',
                type: 'error',
                duration: 5000
            });
            return null;
        }

        // Check if provider is MetaMask
        // Request account access
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            if (accounts.length === 0) {
                toasts.add({
                    title: 'No accounts found',
                    description: 'Please connect an account in MetaMask',
                    type: 'error',
                    duration: 5000
                });
                return null;
            }

            toasts.add({
                title: 'Connected to MetaMask',
                description: `Connected with account ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`,
                type: 'success',
                duration: 3000
            });

            return provider;
        } catch (error) {
            toasts.add({
                title: 'Connection failed',
                description: error instanceof Error ? error.message : 'Could not connect to MetaMask',
                type: 'error',
                duration: 5000
            });
            return null;
        }
    } catch (error) {
        toasts.add({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Something went wrong',
            type: 'error',
            duration: 5000
        });
        return null;
    }
}

/**
 * Get all NFTs owned by the current user
 * @param contractAddress The address of the PokemonNFT contract
 * @returns Array of NFTs owned by the connected user, or null if error
 */
export async function getUserNFTs(contractAddress: string) {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        // Create contract instance
        const nftContract = new ethers.Contract(
            contractAddress,
            PokemonNFTABI.abi,
            signer
        );

        // Get total number of tokens (this is not in the original contract, so we'll need to iterate)
        // Start from 1 as the counter in the contract starts from 1
        const userTokens = [];
        let tokenId = 1;
        let continueSearching = true;

        while (continueSearching) {
            try {
                // Check if the token exists and if user owns it
                const owner = await nftContract.ownerOf(tokenId);
                if (owner.toLowerCase() === userAddress.toLowerCase()) {
                    const details = await nftContract.getPokemonDetails(tokenId);

                    userTokens.push({
                        id: tokenId,
                        name: details[0],
                        pokeType: details[1],
                        level: Number(details[2])
                    });
                }
                tokenId++;
            } catch (error) {
                // If we get an error, we've likely reached the end of the tokens
                continueSearching = false;
            }

            // Safety limit in case there are too many tokens
            if (tokenId > 1000) {
                continueSearching = false;
            }
        }

        return userTokens;
    } catch (error) {
        toasts.add({
            title: 'Failed to load NFTs',
            description: error instanceof Error ? error.message : 'Could not retrieve your NFTs',
            type: 'error',
            duration: 5000
        });
        return null;
    }
}

/**
 * Get all NFTs listed on the Pokemon Marketplace
 * @param marketContractAddress The address of the PokemonMarket contract
 * @param nftContractAddress The address of the PokemonNFT contract
 * @returns Array of NFTs listed on the marketplace, or null if error
 */
export async function getMarketplaceItems(marketContractAddress: string, nftContractAddress: string) {
    return []
}

/**
* Create a new Pokemon NFT
* @param contractAddress The address of the PokemonNFT contract
* @param tokenURI The URI for the token metadata
* @returns The transaction receipt if successful, null if error
*/
export async function createPokemonNFT(contractAddress: string, name: string, pokeType: string, level: number) {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Create contract instance
        const nftContract = new ethers.Contract(
            contractAddress,
            PokemonNFTABI.abi,
            signer
        );
        // Call mintPokemon function on the contract
        // Get player address (current user)
        const playerAddress = await signer.getAddress();

        const transaction = await nftContract.mintPokemon(playerAddress, name, pokeType, level);
        const tx = await transaction.wait();
        console.log("Pokemon NFT created, transaction:", tx);

        toasts.add({
            title: 'Pokemon Created',
            description: 'Your Pokemon NFT has been successfully created',
            type: 'success',
            duration: 3000
        });

        return tx;
        // Create the NFT
    } catch (error) {
        toasts.add({
            title: 'Failed to create Pokemon',
            description: error instanceof Error ? error.message : 'Could not mint your Pokemon NFT',
            type: 'error',
            duration: 5000
        });
        return null;
    }
}

/**
 * List a Pokemon NFT for sale on the marketplace
 * @param marketContractAddress The address of the PokemonMarket contract
 * @param tokenId The ID of the token to list
 * @param price The price in ETH
 * @returns The transaction receipt if successful, null if error
 */
export async function listPokemonOnMarket(marketContractAddress: string, tokenId: number, price: string) {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Create contract instance for the marketplace
        const marketContract = new ethers.Contract(
            marketContractAddress,
            PokemonMarketABI.abi,
            signer
        );

        // Convert price from ETH to Wei
        const priceInWei = ethers.parseEther(price);

        // First approve the market contract to transfer the NFT
        const nftContractAddress = await marketContract.pokemonNFT();
        const nftContract = new ethers.Contract(
            nftContractAddress,
            PokemonNFTABI.abi,
            signer
        );

        const approvalTx = await nftContract.approve(marketContractAddress, tokenId);
        await approvalTx.wait();

        // Now list the pokemon
        const transaction = await marketContract.listPokemon(tokenId, priceInWei);
        const tx = await transaction.wait();

        toasts.add({
            title: 'Pokemon Listed',
            description: 'Your Pokemon NFT has been listed on the marketplace',
            type: 'success',
            duration: 3000
        });

        return tx;
    } catch (error) {
        toasts.add({
            title: 'Failed to list Pokemon',
            description: error instanceof Error ? error.message : 'Could not list your Pokemon NFT',
            type: 'error',
            duration: 5000
        });
        return null;
    }
}
