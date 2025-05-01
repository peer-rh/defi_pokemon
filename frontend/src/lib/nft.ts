import { toasts } from 'svelte-toasts';

import PokemonNFTABI from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
import { ethers, BrowserProvider } from 'ethers';
import { PUBLIC_NFT_CONTRACT_ADDRESS } from '$env/static/public';
import * as POKEMON_DATA from '$lib/pokemons.json';

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
        console.log('User address:', this.userAddress);
        console.log('Provider:', provider);

        // Create contract instance
        this.contract = new ethers.Contract(
            PUBLIC_NFT_CONTRACT_ADDRESS,
            PokemonNFTABI.abi,
            signer
        );
    }


    async fetchUserNFTs() {
        const totalSupply = await this.contract.totalSupply();
        let userNFTs = [];

        for (let i = 0; i < totalSupply; i++) {
            try {
                const tokenId = await this.contract.tokenByIndex(i);
                const owner = await this.contract.ownerOf(tokenId);

                if (owner.toLowerCase() === this.userAddress!.toLowerCase()) {
                    const details = await this.contract.getPokemonDetails(tokenId);
                    const level = details[1].toNumber();
                    const baseIdx = details[0].toNumber();
                    const pokeData = POKEMON_DATA[baseIdx];

                    userNFTs.push({
                        tokenId,
                        baseIdx,
                        level,
                        name: pokeData.english_name,
                        description: pokeData.description,
                        imageURI: "https://github.com/cristobalmitchell/pokedex/blob/main/images/small_images/" + pokeData.national_number.toString().padStart(3, '0') + ".png?raw=true",
                        primaryType: pokeData.primary_type,
                        secondaryType: pokeData.secondary_type,
                        attack: pokeData.attack,
                        defense: pokeData.defense
                    });
                }
            } catch (error) {
                console.error('Error fetching NFT:', error);
            }
        }
        return userNFTs;
    }

    async isAdmin() {
        if (!this.contract || !this.userAddress) {
            console.log
            return false;
        }
        const isAdmin = await this.contract.isContractOwner();
        return isAdmin;
    }
}