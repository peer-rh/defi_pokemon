require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
    networks: {
        hardhat: {
            accounts: {
                mnemonic: process.env.SEED_PHRASE,
            },
            chainId: 1337,
        },
    },
};
