import { toasts } from 'svelte-toasts';

import detectEthereumProvider from '@metamask/detect-provider';

/**
 * Checks if MetaMask is available and connects to it
 * @returns The Ethereum provider if available and connected, null otherwise
 */
export async function connectMetaMask() {
    try {
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
