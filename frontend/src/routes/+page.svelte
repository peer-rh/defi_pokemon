<script lang="ts">
    import { onMount } from "svelte";
    import {
        connectMetaMask,
        getUserNFTs,
        getMarketplaceItems,
        createPokemonNFT,
        listPokemonOnMarket,
    } from "$lib/meta-mask";
    import {
        PUBLIC_NFT_CONTRACT_ADDRESS,
        PUBLIC_MARKETPLACE_CONTRACT_ADDRESS,
    } from "$env/static/public";

    let account = "";
    let nfts: any[] = [];
    let marketplaceItems: any[] = [];
    let isConnecting = false;
    let error = "";

    // Replace these with your actual contract addresses
    const nftContractAddress: string = PUBLIC_NFT_CONTRACT_ADDRESS!;
    const marketContractAddress: string = PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!;

    async function connectWallet() {
        isConnecting = true;
        error = "";

        try {
            const provider = await connectMetaMask();
            if (provider) {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                account = accounts[0];
                await fetchNFTs();
                await fetchMarketplaceItems();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : "Connection failed";
            console.error("Connection error:", err);
        } finally {
            isConnecting = false;
        }
    }

    async function fetchNFTs() {
        if (!account) return;

        try {
            const userNFTs = await getUserNFTs(nftContractAddress);
            if (userNFTs) {
                nfts = userNFTs;
            }
        } catch (err) {
            error = "Failed to fetch NFTs";
            console.error("NFT fetch error:", err);
        }
    }

    async function fetchMarketplaceItems() {
        try {
            const items = await getMarketplaceItems(
                marketContractAddress,
                nftContractAddress,
            );
            if (items) {
                marketplaceItems = items;
            }
        } catch (err) {
            error = "Failed to fetch marketplace items";
            console.error("Marketplace fetch error:", err);
        }
    }

    onMount(() => {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts: any) => {
                account = accounts[0] || "";
                fetchNFTs();
                fetchMarketplaceItems();
            });
        }
    });
</script>

<div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold text-center mb-8 text-indigo-700">
        Welcome to DeFi Pokemon
    </h1>

    <section class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">
            DeFi Pokemon NFTs
        </h2>

        {#if !account}
            <div class="flex justify-center">
                <button
                    on:click={connectWallet}
                    disabled={isConnecting}
                    class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {#if isConnecting}
                        <span class="flex items-center justify-center">
                            <svg
                                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                ></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Connecting...
                        </span>
                    {:else}
                        Connect with MetaMask
                    {/if}
                </button>
            </div>
        {:else}
            <p
                class="text-center mb-6 px-4 py-2 bg-green-100 text-green-800 rounded-md"
            >
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </p>

            <h3 class="text-xl font-medium mb-4 text-gray-700 border-b pb-2">
                Your Pokemon NFTs
            </h3>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8"
            >
                <!-- Mint button as first item in grid -->
                <div
                    class="bg-gray-50 rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center justify-center"
                >
                    <button
                        class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors"
                        on:click={async () => {
                            try {
                                error = "";

                                const name = prompt("Enter Pokemon name") || "";
                                const type = prompt("Enter Pokemon type") || "";
                                const level = parseInt(
                                    prompt("Enter Pokemon level") || "1",
                                    10,
                                );
                                const result = await createPokemonNFT(
                                    nftContractAddress,
                                    name,
                                    type,
                                    level,
                                );
                                if (result) {
                                    // Refresh NFTs after minting
                                    await fetchNFTs();
                                }
                            } catch (err) {
                                error =
                                    err instanceof Error
                                        ? err.message
                                        : "Failed to mint Pokemon";
                                console.error("Minting error:", err);
                            }
                        }}
                    >
                        <svg
                            class="inline-block w-5 h-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Mint New Pokemon
                    </button>
                </div>

                <!-- NFT cards -->
                {#each nfts as nft}
                    <div
                        class="bg-gray-50 rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow border border-gray-200"
                    >
                        <div class="relative">
                            {#if nft.metadata && nft.metadata.image}
                                <img
                                    src={nft.metadata.image}
                                    alt={nft.metadata.name ||
                                        `Pokemon #${nft.id}`}
                                    class="w-full h-48 object-cover"
                                />
                            {:else}
                                <img
                                    src="/placeholder.png"
                                    alt={`${nft.name || `Pokemon #${nft.id}`}`}
                                    class="w-full h-48 object-cover bg-gray-200"
                                />
                            {/if}
                        </div>
                        <div class="p-4">
                            <h3 class="font-semibold text-lg mb-2">
                                {nft.name || `Pokemon #${nft.id}`}
                            </h3>
                            <p class="text-gray-600 text-sm mb-2">
                                Type: {nft.pokeType || "Unknown"} | Level: {nft.level ||
                                    "?"}
                            </p>
                            <button
                                class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                                on:click={async () => {
                                    try {
                                        error = "";
                                        const price =
                                            prompt("Enter price in ETH");
                                        if (!price) return;

                                        const result =
                                            await listPokemonOnMarket(
                                                marketContractAddress,
                                                nft.id,
                                                price,
                                            );

                                        if (result) {
                                            await fetchNFTs();
                                            await fetchMarketplaceItems();
                                        }
                                    } catch (err) {
                                        error =
                                            err instanceof Error
                                                ? err.message
                                                : "Failed to list Pokemon";
                                        console.error("Listing error:", err);
                                    }
                                }}
                            >
                                Sell on Marketplace
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
            <h3 class="text-xl font-medium mb-4 text-gray-700 border-b pb-2">
                Marketplace Pokemon
            </h3>
            {#if marketplaceItems && marketplaceItems.length > 0}
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                    {#each marketplaceItems as item}
                        <div
                            class="bg-gray-50 rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow border border-gray-200"
                        >
                            {#if item.metadata && item.metadata.image}
                                <img
                                    src={item.metadata.image}
                                    alt={item.metadata.name ||
                                        `Pokemon #${item.tokenId}`}
                                    class="w-full h-48 object-cover"
                                />
                            {:else}
                                <img
                                    src="/placeholder.png"
                                    alt={`Pokemon #${item.tokenId}`}
                                    class="w-full h-48 object-cover bg-gray-200"
                                />
                            {/if}
                            <div class="p-4">
                                <h3 class="font-semibold text-lg mb-2">
                                    {item.metadata?.name ||
                                        `Pokemon #${item.tokenId}`}
                                </h3>
                                <p class="text-gray-600 text-sm mb-3">
                                    {item.metadata?.description ||
                                        "No description available"}
                                </p>
                                <p class="text-indigo-600 font-bold">
                                    {item.price} ETH
                                </p>
                                <button
                                    class="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md transition-colors"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="text-center text-gray-500 my-8">
                    No Pokemon available in the marketplace.
                </p>
            {/if}
        {/if}

        {#if error}
            <p class="mt-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</p>
        {/if}
    </section>
    <section class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">
            All Marketplace Items
        </h2>

        {#if marketplaceItems && marketplaceItems.length > 0}
            <div class="mb-6 flex flex-wrap gap-4">
                <div class="flex-1 min-w-[200px]">
                    <label
                        for="sort"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Sort by</label
                    >
                    <select
                        id="sort"
                        class="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                        <option value="level">Level</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[200px]">
                    <label
                        for="filter"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Filter by Type</label
                    >
                    <select
                        id="filter"
                        class="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="all">All Types</option>
                        <option value="fire">Fire</option>
                        <option value="water">Water</option>
                        <option value="grass">Grass</option>
                        <option value="electric">Electric</option>
                    </select>
                </div>
            </div>

            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
                {#each marketplaceItems as item}
                    <div
                        class="bg-gray-50 rounded-lg overflow-hidden shadow hover:shadow-lg transition-all duration-300 border border-gray-200 flex flex-col"
                    >
                        <div class="relative">
                            {#if item.metadata && item.metadata.image}
                                <img
                                    src={item.metadata.image}
                                    alt={item.metadata.name ||
                                        `Pokemon #${item.tokenId}`}
                                    class="w-full h-48 object-cover"
                                />
                            {:else}
                                <img
                                    src="/placeholder.png"
                                    alt={`Pokemon #${item.tokenId}`}
                                    class="w-full h-48 object-cover bg-gray-200"
                                />
                            {/if}
                            <span
                                class="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full"
                            >
                                ID: {item.tokenId}
                            </span>
                        </div>
                        <div class="p-4 flex-1 flex flex-col">
                            <h3 class="font-semibold text-lg">
                                {item.metadata?.name ||
                                    `Pokemon #${item.tokenId}`}
                            </h3>
                            <p class="text-gray-600 text-sm my-1">
                                Type: {item.metadata?.attributes?.[0]?.value ||
                                    "Unknown"}
                            </p>
                            <p class="text-gray-600 text-sm mb-3">
                                Level: {item.metadata?.attributes?.[1]?.value ||
                                    "?"}
                            </p>
                            <div class="mt-auto pt-3 border-t border-gray-100">
                                <p class="text-indigo-600 font-bold text-lg">
                                    {item.price} ETH
                                </p>
                                <button
                                    class="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md transition-colors"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="text-center py-12 bg-gray-50 rounded-lg">
                <svg
                    class="w-16 h-16 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12a4 4 0 100-8 4 4 0 000 8z"
                    />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">
                    No Pokemon available
                </h3>
                <p class="mt-1 text-gray-500">
                    There are currently no Pokemon listed on the marketplace.
                </p>
            </div>
        {/if}
    </section>
</div>
