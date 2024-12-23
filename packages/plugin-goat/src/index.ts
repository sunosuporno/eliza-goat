import type { Plugin } from "@ai16z/eliza";
import { getOnChainActions } from "./actions";
import { erc20, USDC } from "@goat-sdk/plugin-erc20";
import { sendETH } from "@goat-sdk/wallet-evm";
import { kim } from "@goat-sdk/plugin-kim";
import { ironclad } from "@goat-sdk/plugin-ironclad";
import { renzo } from "@goat-sdk/plugin-renzo";
import { getWalletClient, getWalletProvider } from "./wallet";
// import { coingecko } from "@goat-sdk/plugin-coingecko";

async function createGoatPlugin(
    getSetting: (key: string) => string | undefined
): Promise<Plugin> {
    console.log("Creating GOAT plugin...");
    const walletClient = getWalletClient(getSetting);

    if (!walletClient) {
        console.error("Failed to create wallet client!");
        return {
            name: "[GOAT] Onchain Actions",
            description: "Mode integration plugin",
            providers: [],
            evaluators: [],
            services: [],
            actions: [],
        };
    }

    console.log("Created wallet client successfully");
    const walletProvider = getWalletProvider(walletClient);
    console.log(
        "Created wallet provider with actions:",
        walletProvider?.actions?.length || 0
    );

    const actions = await getOnChainActions({
        wallet: walletClient,
        plugins: [
            sendETH(),
            erc20({
                tokens: [
                    USDC,
                    {
                        decimals: 18,
                        symbol: "WETH",
                        name: "Wrapped Ether",
                        chains: {
                            "34443": {
                                contractAddress:
                                    "0x4200000000000000000000000000000000000006",
                            },
                        },
                    },
                ],
            }),
            kim(),
            ironclad(),
            renzo(),
            // erc20({ tokens: [USDC] }),
            // coingecko({
            //     apiKey: getSetting("COINGECKO_API_KEY"),
            // }),
        ],
    });

    return {
        name: "[GOAT] Onchain Actions",
        description: "Mode integration plugin",
        providers: [walletProvider],
        evaluators: [],
        services: [],
        actions: [...actions, ...(walletProvider?.actions || [])],
    };
}

export default createGoatPlugin;
