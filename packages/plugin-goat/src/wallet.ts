import { WalletClientBase } from "@goat-sdk/core";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mode } from "viem/chains";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { parseAbi } from "viem";
import {
    EVMTypedData,
    EVMTransaction,
    EVMReadRequest,
} from "@goat-sdk/wallet-evm";
import { IAgentRuntime, Action } from "@ai16z/eliza";

export const chain = mode;

export function getWalletClient(
    getSetting: (key: string) => string | undefined
) {
    console.log("Creating wallet client...");
    const privateKey = getSetting("EVM_PRIVATE_KEY");
    if (!privateKey) {
        console.error("EVM_PRIVATE_KEY not configured");
        return null;
    }

    const provider = getSetting("EVM_PROVIDER_URL");
    if (!provider) {
        console.error("EVM_PROVIDER_URL not configured");
        return null;
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const wallet = createWalletClient({
        account,
        chain,
        transport: http(provider),
    }) as any;

    return viem(wallet);
}

export function getWalletProvider(walletClient: WalletClientBase) {
    console.log("Initializing wallet provider...");
    const evmWallet = walletClient as EVMWalletClient;

    if (!walletClient) {
        console.error("No wallet client provided!");
        return null;
    }

    console.log(
        "Wallet client methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(walletClient))
    );

    return {
        name: "WALLET",
        description: "Provides wallet information",
        async get(): Promise<string | null> {
            console.log("Starting wallet provider get()...");
            try {
                console.log("Getting wallet address...");
                const address = evmWallet.getAddress();
                console.log("Got address:", address);
                console.log("Getting balance...");
                const balance = await evmWallet.balanceOf(address);
                console.log("Got balance:", balance);
                return `EVM Wallet Address: ${address}\nBalance: ${balance.value} ${chain.nativeCurrency.symbol}`;
            } catch (error) {
                console.error("Error in wallet provider:", error);
                return null;
            }
        },
        actions: [
            {
                name: "GET_WALLET_ADDRESS",
                description: "Get the current wallet address using GOAT tool",
                handler: async (runtime: IAgentRuntime) => {
                    console.log("GET_WALLET_ADDRESS action triggered");
                    const address = await evmWallet.getAddress();
                    return `I found your wallet address using GOAT: ${address}`;
                },
                similes: [
                    "using goat find my wallet address",
                    "using goat get my wallet address",
                    "goat fetch wallet address",
                    "goat show address",
                    "get wallet address with goat",
                ],
                examples: [
                    [
                        {
                            user: "user",
                            content: {
                                text: "Using goat, find out my wallet address",
                            },
                        },
                    ],
                    [
                        {
                            user: "user",
                            content: {
                                text: "Get my wallet address with goat",
                            },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "CHECK_BALANCE",
                description: "Check the wallet balance",
                handler: async (runtime: IAgentRuntime) => {
                    const address = evmWallet.getAddress();
                    const balance = await evmWallet.balanceOf(address);
                    return `${balance.value} ${chain.nativeCurrency.symbol}`;
                },
                similes: ["check balance", "show balance"],
                examples: [
                    [
                        {
                            user: "user",
                            content: { text: "What's my wallet balance?" },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "SEND_ETH",
                description: "Send ETH to an address",
                parameters: {
                    to: "string",
                    amount: "string",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: { to: string; amount: string }
                ) => {
                    const result = await evmWallet.sendTransaction({
                        to: options.to,
                        value: BigInt(options.amount),
                    });
                    return `Transaction sent: ${result.hash}`;
                },
                similes: ["send eth", "transfer eth"],
                examples: [
                    [
                        {
                            user: "user",
                            content: { text: "Send 0.1 ETH to 0x123..." },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "CHECK_TOKEN_BALANCE",
                description: "Check ERC20 token balance",
                parameters: {
                    tokenAddress: "string",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: { tokenAddress: string }
                ) => {
                    const address = evmWallet.getAddress();
                    const result = await evmWallet.read({
                        address: options.tokenAddress,
                        abi: parseAbi([
                            "function balanceOf(address) view returns (uint256)",
                        ]),
                        functionName: "balanceOf",
                        args: [address],
                    });
                    return `Token balance: ${result.value}`;
                },
                similes: ["check token balance", "token balance"],
                examples: [
                    [
                        {
                            user: "user",
                            content: {
                                text: "What's my balance of token 0x123...",
                            },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "GET_CHAIN",
                description: "Get the current chain information",
                handler: async (runtime: IAgentRuntime) => evmWallet.getChain(),
                similes: ["which chain", "current chain"],
                examples: [
                    [
                        {
                            user: "user",
                            content: { text: "What chain am I on?" },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "RESOLVE_ADDRESS",
                description: "Resolve an ENS name to address",
                parameters: {
                    address: "string",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: { address: string }
                ) => {
                    const resolved = await evmWallet.resolveAddress(
                        options.address
                    );
                    return resolved;
                },
                similes: ["resolve ens", "lookup ens"],
                examples: [
                    [
                        {
                            user: "user",
                            content: { text: "Resolve vitalik.eth" },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "SIGN_TYPED_DATA",
                description: "Sign EIP-712 typed data",
                parameters: {
                    domain: "object",
                    types: "object",
                    message: "object",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: EVMTypedData
                ) => {
                    const result = await evmWallet.signTypedData(options);
                    return result.signature;
                },
                similes: ["sign data", "sign message"],
                examples: [
                    [
                        {
                            user: "user",
                            content: { text: "Sign this typed data" },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "SEND_TRANSACTION",
                description: "Send a transaction with custom data",
                parameters: {
                    to: "string",
                    abi: "object",
                    functionName: "string",
                    args: "object",
                    value: "string",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: EVMTransaction
                ) => {
                    const result = await evmWallet.sendTransaction(options);
                    return `Transaction sent: ${result.hash}`;
                },
                similes: ["send transaction", "execute transaction"],
                examples: [
                    [
                        {
                            user: "user",
                            content: {
                                text: "Send a transaction to contract 0x123...",
                            },
                        },
                    ],
                ],
                validate: async () => true,
            },
            {
                name: "READ_CONTRACT",
                description: "Read data from a smart contract",
                parameters: {
                    address: "string",
                    abi: "object",
                    functionName: "string",
                    args: "object",
                },
                handler: async (
                    runtime: IAgentRuntime,
                    message: any,
                    state: any,
                    options: EVMReadRequest
                ) => {
                    const result = await evmWallet.read(options);
                    return result;
                },
                similes: ["read contract", "call contract"],
                examples: [
                    [
                        {
                            user: "user",
                            content: {
                                text: "Read data from contract 0x123...",
                            },
                        },
                    ],
                ],
                validate: async () => true,
            },
        ],
    };
}
