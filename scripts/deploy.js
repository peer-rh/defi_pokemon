const hre = require("hardhat");
const pokemons = require("../frontend/src/lib/pokemons.json");
const fs = require("fs");
const path = require("path");
const nftArtifact = require("../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    const maxId = pokemons.length;

    // Deploy the PokemonNFT contract
    const PokemonNFT = await hre.ethers.getContractFactory("PokemonNFT");
    const pokemonNFT = await PokemonNFT.deploy(maxId);
    await pokemonNFT.waitForDeployment();
    console.log("PokemonNFT deployed to:", await pokemonNFT.getAddress());

    const frontendDir = path.join(__dirname, "../frontend/src/lib/");

    // Write contract addresses and ABIs to frontend
    fs.writeFileSync(
        path.join(frontendDir, "contracts-config.json"),
        JSON.stringify({
            nftAddress: await pokemonNFT.getAddress(),
            nftAbi: nftArtifact.abi,
        }, null, 2)
    );

    console.log("Contract artifacts copied to frontend");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
