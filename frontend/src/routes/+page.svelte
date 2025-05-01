<script lang="ts">
    import { onMount } from "svelte";
    import { connectMetaMask } from "$lib/meta-mask";
    import { NFTHandler } from "$lib/nft";
    import { toasts } from "svelte-toasts";

    let account = "";
    let isConnecting = false;
    let nftHandler: NFTHandler | null = null;
    console.log("account", account);

    onMount(async () => {
        try {
            const provider = await connectMetaMask();
            if (provider) {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                account = accounts[0];
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
        provider.on("accountsChanged", (accounts: any) => {
            account = accounts[0] || "";
            nftHandler = new NFTHandler();
        });
    });
</script>

<div class="container mx-auto px-4 py-8">
    <!-- Section Admin 
            if the connected account is the admin address then show the admin panel, where he can mint new NFTs
            -->
    {#if nftHandler?.isAdmin}
        You are the admin
    {/if}
    <!-- Section Owned Pokemons 
                Show a grid of all pokemons owned by the connected account
                Each card should show the pokemon image, name and level, and on click a pop up should appear, where he can sell, auction and see more info about the pokemon
                - If already listed on the market, show a button to cancel the listing
            -->
    <div class="my-8">
        <h2 class="text-2xl font-bold mb-4">My Pokémon Collection</h2>

        {#if nftHandler && nftHandler.userNFTs && nftHandler.userNFTs.length > 0}
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {#each nftHandler.userNFTs as pokemon}
                    <div
                        class="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
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
                            <p class="text-gray-700">Level: {pokemon.level}</p>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-gray-600">You don't own any Pokémon NFTs yet.</p>
        {/if}
    </div>
    <!-- Section Market 
                Show all the pokemons listed on the market
                Each card should show the pokemon image, name and level, and current price and on click a pop up should appear, where he can buy the pokemon
            -->
</div>
