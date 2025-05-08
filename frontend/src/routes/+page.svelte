<script lang="ts">
    import { onMount } from "svelte";
    import { connectMetaMask } from "$lib/meta-mask";
    import { NFTHandler, type PokemonNFT } from "$lib/nft";
    import { toasts } from "svelte-toasts";
    import pokemonList from "$lib/pokemons.json";
    let selectedPokemonIndex: number = 0;
    let mintLevel: number = 1;
    let auctionTime = 1;
    let auctionTimeHours = 0;

    let bid: number = 0.001;
    let requestedAlready = {};
    let isConnecting = false;
    let nftHandler: NFTHandler = new NFTHandler();
    let isAdmin = false;
    let userNFTs: PokemonNFT[] = [];
    let marketplaceListings: PokemonNFT[] = []; // State for marketplace listings
    let interval: ReturnType<typeof setInterval>;
    let countdowns: { [tokenId: number]: string } = {};
    let isPaused = false;

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
        interval = setInterval(updateAndFormatTime, 1000);
        isPaused = await nftHandler.isPaused();
    });

    let selectedPokemon: PokemonNFT | null = null;
    let showModal = false;
    let showBidModal = false;
    let listingPrice: string = "";
    let auctionTimeMinutes: number = 0;


    async function togglePause(){
        try{
            await nftHandler.togglePaused();
            isPaused = await nftHandler.isPaused();
            toasts.success(`Successfully set contract paused state to ${isPaused}!`);
        }catch(error){
            console.error("Error toggling", error);
            toasts.error("Failed to switch.");
        }
    }

    function openModal(pokemonItem: PokemonNFT, isBidding: boolean) {
        selectedPokemon = pokemonItem;
        console.log("openModal", selectedPokemon.auction);
        if (!isBidding) {
            showModal = true;
        } else {
            bid = Math.max(
                parseFloat(pokemonItem.auction?.highestBid),
                parseFloat(pokemonItem.listingPrice),
            );
            showBidModal = true;
        }
    }

    function closeModal(isBidding: boolean) {
        selectedPokemon = null;
        listingPrice = ""; // Reset listing price on close
        if (isBidding) {
            showModal = false;
        } else {
            showBidModal = false;
        }
    }

    async function updateAndFormatTime() {
        for (const pokemon of marketplaceListings) {
            if (pokemon.auction) {
                const endTime = pokemon.auction.auctionEndTime;
                const currentTime = Math.floor(Date.now() / 1000); // seconds
                const remainingSeconds = Number(endTime) - currentTime;
                if (remainingSeconds <= 0) {
                    countdowns[pokemon.tokenId] = "Auction ended";
                    tryEndingAuction(pokemon);
                } else {
                    const h = Math.floor(remainingSeconds / 3600);
                    const m = Math.floor((remainingSeconds % 3600) / 60);
                    const s = remainingSeconds % 60;
                    countdowns[pokemon.tokenId] = `${h}h ${m}m ${s}s`;
                }
            }
        }
    }

    async function tryEndingAuction(pokemon: PokemonNFT) {
        if (
            !pokemon.auction?.auctionEnded &&
            !requestedAlready[pokemon.tokenId]
        ) {
            console.log("End Auction", pokemon);
            requestedAlready[pokemon.tokenId] = true;
            try {
                await nftHandler.endAuction(pokemon.tokenId);
            } catch (error) {
                if (error.message.includes("Auction not ended")) {
                    // Wait for 3 seconds and try again
                    console.log(
                        "Auction not ended yet, waiting 3 seconds to try again...",
                    );
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    requestedAlready[pokemon.tokenId] = false; // Reset the flag to allow retry
                }
                toasts.error("Failed to end auction.");
                console.error("Error ending auction:", error);
            }
            userNFTs = await nftHandler.fetchUserNFTs();
            marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
        }
    }

    async function cancelListing() {
        if (selectedPokemon) {
            try {
                if (selectedPokemon.auction) {
                    await nftHandler.endAuction(selectedPokemon.tokenId);
                } else {
                    await nftHandler.cancelListing(selectedPokemon.tokenId);
                }
                userNFTs = await nftHandler.fetchUserNFTs();
                marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
                closeModal(false);
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
                closeModal(false);
            } catch (error) {
                console.error("Error listing pokemon:", error);
                toasts.error("Failed to list Pokémon.");
            }
        } else {
            toasts.error("Please enter a valid price.");
        }
    }
    async function auctionPokemon(
        priceInEther: string | number,
        timeInSeconds: number,
    ) {
        if (selectedPokemon && priceInEther) {
            try {
                await nftHandler.auctionPokemonForSale(
                    selectedPokemon.tokenId,
                    priceInEther,
                    timeInSeconds,
                );
                userNFTs = await nftHandler.fetchUserNFTs();
                marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace
                closeModal(false);
            } catch (error) {
                console.error("Error listing pokemon:", error);
                toasts.error("Failed to list Pokémon for auction.");
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

    async function placeBid(tokenId: number, bidAmount: string | number) {
        if (selectedPokemon && bidAmount) {
            try {
                await nftHandler.placeBid(selectedPokemon.tokenId, bidAmount);
                marketplaceListings = await nftHandler.getAllListedPokemons(); // Refresh marketplace

                closeModal(true);
            } catch (error) {
                console.error("Error listing pokemon:", error);
                toasts.error("Failed to bid on Pokemon.");
            }
        } else {
            toasts.error("Please enter a valid price.");
        }
    }
</script>

<div class="container mx-auto px-4 py-8">

    {#if isPaused}
        <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p class="font-bold">⚠️ Contract Paused</p>
            <p>All marketplace functions are currently disabled. Please try again later.</p>
        </div>
    {/if}
    <!-- Section Admin -->
    {#if isAdmin}
        <div class="admin-panel my-4 p-4 bg-gray-100 rounded shadow">
            <h2 class="text-xl font-bold mb-2">Admin Panel</h2>
            <div>
                <button
                    class="bg-blue-500 text-white px-4 py-2 rounded-md rounded hover:bg-blue-600 mb-4"
                on:click={togglePause}
                >   
                {#if isPaused}
                    Unpause Auctions
                {:else}
                    Pause Auctions
                {/if}
            </button>
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
                        class="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow transform hover:scale-105 duration-200 border-2 border-black"
                        on:click={() => openModal(pokemon, false)}
                    >
                        {#if pokemon.auction}
                            <span
                                class="absolute top-2 left-2 bg-yellow-300 text-yellow-800 text-xs font-semibold px-2 py-1 rounded z-10"
                            >
                                In auction currently
                            </span>
                        {:else if pokemon.isListed}
                            <span
                                class="absolute top-2 left-2 bg-yellow-300 text-yellow-800 text-xs font-semibold px-2 py-1 rounded z-10"
                            >
                                Listed for {pokemon.listingPrice} ETH
                            </span>
                        {/if}
                        <img
                            src={pokemon.imageURI}
                            alt={pokemon.name}
                            class="w-full h-auto object-cover"
                        />
                        <div class="flex justify-center items-center transform -translate-y-[-50%]">
                            <img src="/pokeball_faint.svg" alt="Pokeball" class="w-10 h-10" />
                        </div>
                        <div class="p-4 bg-red-500">
                            <h3 class="text-lg font-semibold text-white">
                                {pokemon.name}
                            </h3>
                            <p class="text-white">Level: {pokemon.level}</p>
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
                on:click|self={() => closeModal(false)}
            >
                <div class="bg-white rounded-lg p-6 w-96 relative shadow-xl">
                    <button
                        on:click={() => closeModal(false)}
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

                    {#if selectedPokemon.isListed || selectedPokemon.auction}
                        <div class="text-center mb-4">
                            {#if selectedPokemon.auction}
                                <p class="font-semibold">
                                    Auctioned for: {selectedPokemon.listingPrice}
                                    ETH
                                </p>
                                <p>
                                    Current highest bid: {selectedPokemon
                                        .auction?.highestBid} ETH
                                </p>
                            {:else}
                                <p class="font-semibold">
                                    Listed for: {selectedPokemon.listingPrice} ETH
                                </p>
                            {/if}
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
                                >Listing/Auction start Price (ETH):</label
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
                        <div class="mb-2">
                            <label
                                for="auction-time-minutes"
                                class="block text-sm font-medium text-gray-700 mb-1"
                                >Auction time in minutes:</label
                            >
                            <input
                                id="auction-time-minutes"
                                type="number"
                                step="1"
                                min="0"
                                max="59"
                                bind:value={auctionTime}
                                placeholder="e.g., 42"
                                class="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div class="mb-2">
                            <label
                                for="auction-time-hours"
                                class="block text-sm font-medium text-gray-700 mb-1"
                                >Auction time in hours:</label
                            >
                            <input
                                id="auction-time-hours"
                                type="number"
                                step="1"
                                min="0"
                                defaultValue="0"
                                bind:value={auctionTimeHours}
                                placeholder="e.g., 42"
                                class="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div class="flex flex-col space-y-4 mt-3">
                            {selectedPokemon.auction}
                            <button
                                on:click={() => sellPokemon(listingPrice)}
                                disabled={!listingPrice ||
                                    parseFloat(listingPrice) <= 0}
                                class="w-full bg-green-500 text-white font-semibold py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                List for Sale
                            </button>

                            <button
                                on:click={() =>
                                    auctionPokemon(
                                        listingPrice,
                                        auctionTime * 60 +
                                            auctionTimeHours * 3600,
                                    )}
                                disabled={!listingPrice ||
                                    parseFloat(listingPrice) <= 0 ||
                                    auctionTime * 60 +
                                        auctionTimeHours * 3600 ==
                                        0}
                                class="w-full bg-green-500 text-white font-semibold py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                List it for auction
                            </button>
                        </div>
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
                            class="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-black"
                        >
                            {#if pokemon.auction?.isHighestBidder}
                                <span class="absolute top-2 left-2 bg-yellow-300 text-yellow-800 text-xs font-semibold px-2 py-1 rounded z-10">
                                    You are the highest bidder
                                </span>
                            {/if}

                            <img
                                src={pokemon.imageURI}
                                alt={pokemon.name}
                                class="w-full h-48 object-cover"
                            />

                            <div class="absolute top-43 left-1/2 transform -translate-x-1/2 z-20">
                                <img src="/pokeball_faint.svg" alt="Pokeball" class="w-10 h-10" />
                            </div>
                            <div class="relative p-4 bg-red-500 text-white h-full flex flex-col">
                                <h3 class="text-lg font-semibold">
                                    {pokemon.name}
                                </h3>
                                <p class="text-gray-100">
                                    Level: {pokemon.level}
                                </p>
                                {#if pokemon.auction}
                                    <p class="text-white font-semibold mt-1">
                                        Current highest bid:
                                    </p>
                                    <p class="text-gray-100 mt-1">
                                        {pokemon.auction.highestBid} ETH
                                    </p>
                                    <p class="text-white font-semibold mt-1">
                                        Remaining time:
                                    </p>
                                    <p class="text-gray-100 mt-1">
                                        {countdowns[pokemon.tokenId]}
                                    </p>
                                {:else}
                                    <p class="text-white font-semibold mt-1">
                                        Price: {pokemon.listingPrice} ETH
                                    </p>
                                {/if}
                                {#if pokemon.auction}
                                    <button
                                        on:click={() =>
                                            openModal(pokemon, true)}
                                        disabled={countdowns[pokemon.tokenId] ==
                                            "Auction ended"}
                                        class="mt-3 w-full bg-white text-black font-semibold py-2 px-4 rounded hover:bg-gray-200 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Bid Now
                                    </button>
                                {:else}
                                    <button
                                        on:click={() => buyPokemon(pokemon)}
                                        class="mt-3 w-full bg-white text-black font-semibold py-2 px-4 rounded hover:bg-gray-200 transition-colors"
                                    >
                                        Buy Now
                                    </button>
                                {/if}
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

    {#if showBidModal && selectedPokemon}
        <div
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            on:click|self={() => closeModal(true)}
        >
            <div class="bg-white rounded-lg p-6 w-96 relative shadow-xl">
                {#if selectedPokemon.auction?.isHighestBidder}
                    <span
                        class="absolute top-2 left-2 bg-yellow-300 text-yellow-800 text-xs font-semibold px-2 py-1 rounded z-10"
                    >
                        You are the highest bidder
                    </span>
                {/if}
                <button
                    on:click={() => closeModal(true)}
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

                <p class="text-center text-sm text-gray-600 mb-4">
                    Remaining time: {countdowns[selectedPokemon.tokenId]}
                </p>

                <h3 class="text-xl font-bold text-center mb-2">
                    Current Highest bid: {selectedPokemon.auction?.highestBid}
                </h3>
                <p class="text-center text-sm text-gray-600 mb-4">
                    Min bid: {selectedPokemon.listingPrice}
                </p>

                <div class="mb-2">
                    <label
                        for="bid-price"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Bid (ETH):</label
                    >
                    <input
                        id="bid-price"
                        type="number"
                        step="0.001"
                        min={Math.max(
                            parseFloat(selectedPokemon.auction?.highestBid),
                            parseFloat(selectedPokemon.listingPrice),
                        )}
                        bind:value={bid}
                        placeholder="e.g., 0.1"
                        class="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <button
                    on:click={() => placeBid(selectedPokemon.tokenId, bid)}
                    disabled={countdowns[selectedPokemon.tokenId] ==
                        "Auction ended"}
                    class="w-full bg-green-500 text-white font-semibold py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Bid
                </button>
            </div>
        </div>
    {/if}
</div>
