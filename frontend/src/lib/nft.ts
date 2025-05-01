import { toasts } from 'svelte-toasts';

import PokemonNFTABI from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
import { ethers, BrowserProvider } from 'ethers';
import { PUBLIC_NFT_CONTRACT_ADDRESS } from '$env/static/public';
import * as POKEMON_DATA from '$lib/pokemons.json';

type PokemonNFT = {
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
    public userNFTs: PokemonNFT[] = [];
    userAddress: string | undefined;
    public isAdmin: boolean = false;
    private contract: ethers.Contract | undefined;

    constructor() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }
        this.init();
    }

    async init() {
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

        // Check if the user is an admin
        const isAdmin = await this.contract.isAdmin(userAddress);
        this.isAdmin = isAdmin;

        await this.fetchUserNFTs();
    }

    async fetchUserNFTs() {
        if (!this.contract) {
            return;
        }

        const totalSupply = await this.contract.totalSupply();
        this.userNFTs = [];

        for (let i = 0; i < totalSupply; i++) {
            try {
                const tokenId = await this.contract.tokenByIndex(i);
                const owner = await this.contract.ownerOf(tokenId);

                if (owner.toLowerCase() === this.userAddress!.toLowerCase()) {
                    const details = await this.contract.getPokemonDetails(tokenId);
                    const level = details[1].toNumber();
                    const baseIdx = details[0].toNumber();
                    const pokeData = POKEMON_DATA[baseIdx];

                    this.userNFTs.push({
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
    }
}