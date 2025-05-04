<script lang="ts">
    import { onMount } from "svelte";
    import { connectMetaMask } from "$lib/meta-mask";
    import { NFTHandler, type PokemonNFT } from "$lib/nft";
    import { toasts } from "svelte-toasts";
    import pokemonList from "$lib/pokemons.json";
    let selectedPokemonIndex: number = 0;
    let mintLevel: number = 1;

    let isConnecting = false;
    let nftHandler: NFTHandler = new NFTHandler();
    let isAdmin = false;
    let userNFTs: PokemonNFT[] = [];
    let marketplaceListings: PokemonNFT[] = []; // State for marketplace listings

    onMount(async () => {
        try {
            const provider = await connectMetaMask();
            if (provider) {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
            } else {
                toasts.error(
                    "Please install MetaMask to use this application.",
                );
                return;
            }
        } catch (err) {
            console.error("Connection error:", err);
        } finally {
            isConnecting = false;
        }
        const provider = window.ethereum;
        await nftHandler.init();
        isAdmin = await nftHandler.isAdmin();
        userNFTs = await nftHandler.fetchUserNFTs();

        // Fetch marketplace listings
        marketplaceListings = await nftHandler.getAllListedPokemons();
    });

    let selectedPokemon: PokemonNFT | null = null;
    let showModal = false;
    let listingPrice: string = "";

    function openModal(pokemonItem: PokemonNFT) {
        selectedPokemon = pokemonItem;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedPokemon = null;
        listingPrice = ""; // Reset listing price on close
    }

    async function cancelListing() {
        if (selectedPokemon) {
            try {
                await nftHandler.cancelListing(selectedPokemon.tokenId);
                userNFTs = await nftHandler.fetchUserNFTs();
                marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
                closeModal();
            } catch (error) {
                console.error("Error cancelling listing:", error);
                toasts.error("Failed to cancel listing.");
            }
        }
    }

    async function sellPokemon(priceInEther: string | number) {
        if (selectedPokemon && priceInEther) {
            try {
                await nftHandler.listPokemonForSale(
                    selectedPokemon.tokenId,
                    priceInEther,
                );
                userNFTs = await nftHandler.fetchUserNFTs();
                marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
                closeModal();
            } catch (error) {
                console.error("Error listing pokemon:", error);
                toasts.error("Failed to list Pokémon.");
            }
        } else {
            toasts.error("Please enter a valid price.");
        }
    }

    async function buyPokemon(pokemon: PokemonNFT) {
        try {
            await nftHandler.buyPokemon(pokemon.tokenId, pokemon.listingPrice);
            userNFTs = await nftHandler.fetchUserNFTs(); // Refresh user's collection
            marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
            toasts.success(`Successfully bought ${pokemon.name}!`);
        } catch (error) {
            console.error("Error buying pokemon:", error);
            toasts.error("Failed to buy Pokémon.");
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <!-- Section Admin -->
    {#if isAdmin}
        <div class="admin-panel my-4 p-4 bg-gray-100 rounded shadow">
            <h2 class="text-xl font-bold mb-2">Admin Panel</h2>
            <div class="mb-2">
                <label for="pokemon-select" class="block font-medium mb-1"
                    >Select Pokémon:</label
                >
                <select
                    id="pokemon-select"
                    bind:value={selectedPokemonIndex}
                    class="w-full border rounded px-2 py-1"
                >
                    {#each pokemonList as pokemon, i}
                        <option value={i}>{pokemon.english_name}</option>
                    {/each}
                </select>
            </div>
            <div class="mb-4">
                <label for="level-input" class="block font-medium mb-1"
                    >Level:</label
                >
                <input
                    id="level-input"
                    type="number"
                    bind:value={mintLevel}
                    min="1"
                    class="w-full border rounded px-2 py-1"
                />
            </div>
            <button
                on:click={async () => {
                    try {
                        await nftHandler.mintPokemonNFT(
                            selectedPokemonIndex,
                            mintLevel,
                        );
                        toasts.success(
                            `Minted ${pokemonList[selectedPokemonIndex].english_name} at level ${mintLevel}`,
                        );
                        userNFTs = await nftHandler.fetchUserNFTs(); // Refresh user NFTs after minting
                    } catch (error) {
                        console.error("Minting error:", error);
                        toasts.error("Failed to mint Pokémon.");
                    }
                }}
                class="bg-blue-500 text-white font-semibold px-4 py-2 rounded hover:bg-blue-600"
            >
                Mint Pokémon
            </button>
        </div>
    {/if}

    <!-- Section Owned Pokemons -->
    <div class="my-8">
        <h2 class="text-2xl font-bold mb-4">My Pokémon Collection</h2>
        {#if userNFTs.length > 0}
            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
                {#each userNFTs as pokemon}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow transform hover:scale-105 duration-200"
                        on:click={() => openModal(pokemon)}
                    >
                        {#if pokemon.isListed}
                            <span
                                class="absolute top-2 left-2 bg-yellow-300 text-yellow-800 text-xs font-semibold px-2 py-1 rounded z-10"
                                >Listed for {pokemon.listingPrice} ETH</span
                            >
                        {/if}
                        <img
                            src={pokemon.imageURI}
                            alt={pokemon.name}
                            class="w-full h-48 object-cover"
                        />
                        <div class="p-4">
                            <h3 class="text-lg font-semibold">
                                {pokemon.name}
                            </h3>
                            <p class="text-gray-700">Level: {pokemon.level}</p>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p>You don't own any Pokémon yet.</p>
        {/if}

        <!-- Modal for Owned Pokemon Actions -->
        {#if showModal && selectedPokemon}
            <div
                class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                on:click|self={closeModal}
            >
                <div class="bg-white rounded-lg p-6 w-96 relative shadow-xl">
                    <button
                        on:click={closeModal}
                        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close modal">×</button
                    >
                    <img
                        src={selectedPokemon.imageURI}
                        alt={selectedPokemon.name}
                        class="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-gray-200"
                    />
                    <h3 class="text-xl font-bold text-center mb-2">
                        {selectedPokemon.name}
                    </h3>
                    <p class="text-center mb-1">
                        Level: {selectedPokemon.level}
                    </p>
                    <p class="text-center text-sm text-gray-600 mb-4">
                        Token ID: {selectedPokemon.tokenId}
                    </p>

                    {#if selectedPokemon.isListed}
                        <div class="text-center mb-4">
                            <p class="font-semibold">
                                Listed for: {selectedPokemon.listingPrice} ETH
                            </p>
                        </div>
                        <button
                            on:click={cancelListing}
                            class="w-full bg-red-500 text-white font-semibold py-2 rounded mb-2 hover:bg-red-600 transition-colors"
                        >
                            Cancel Listing
                        </button>
                    {:else}
                        <div class="mb-2">
                            <label
                                for="listing-price"
                                class="block text-sm font-medium text-gray-700 mb-1"
                                >Listing Price (ETH):</label
                            >
                            <input
                                id="listing-price"
                                type="number"
                                step="0.001"
                                min="0"
                                bind:value={listingPrice}
                                placeholder="e.g., 0.1"
                                class="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <button
                            on:click={() => sellPokemon(listingPrice)}
                            disabled={!listingPrice ||
                                parseFloat(listingPrice) <= 0}
                            class="w-full bg-green-500 text-white font-semibold py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            List for Sale
                        </button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <!-- Section Marketplace -->
    <div class="my-8">
        <h2 class="text-2xl font-bold mb-4">Marketplace</h2>
        {#if marketplaceListings.length > 0}
            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
                {#each marketplaceListings as pokemon}
                    {#if pokemon.owner.toLowerCase() !== nftHandler.userAddress.toLowerCase()}
                        <div
                            class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <img
                                src={pokemon.imageURI}
                                alt={pokemon.name}
                                class="w-full h-48 object-cover"
                            />
                            <div class="p-4">
                                <h3 class="text-lg font-semibold">
                                    {pokemon.name}
                                </h3>
                                <p class="text-gray-700">
                                    Level: {pokemon.level}
                                </p>
                                <p class="text-gray-900 font-bold mt-1">
                                    Price: {pokemon.listingPrice} ETH
                                </p>
                                <button
                                    on:click={() => buyPokemon(pokemon)}
                                    class="mt-3 w-full bg-purple-500 text-white font-semibold py-2 px-4 rounded hover:bg-purple-600 transition-colors"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        {:else}
            <p>No Pokémon currently listed on the marketplace.</p>
        {/if}
        {#if marketplaceListings.filter((p) => p.owner.toLowerCase() !== nftHandler.userAddress.toLowerCase()).length === 0 && marketplaceListings.length > 0}
            <p>
                No Pokémon currently listed on the marketplace by other users.
            </p>
        {/if}
    </div>
</div>
