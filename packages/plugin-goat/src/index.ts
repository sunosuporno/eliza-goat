import type { Plugin } from "@ai16z/eliza";
import { getOnChainActions } from "./actions";
import { erc20, USDC } from "@goat-sdk/plugin-erc20";
import { sendETH } from "@goat-sdk/wallet-evm";
import { getWalletClient, getWalletProvider } from "./wallet";
// import { coingecko } from "@goat-sdk/plugin-coingecko";

async function createGoatPlugin(
    getSetting: (key: string) => string | undefined
): Promise<Plugin> {
    const walletClient = getWalletClient(getSetting);
    const actions = await getOnChainActions({
        wallet: walletClient,
        // Add plugins here based on what actions you want to use
        // See all available plugins at https://ohmygoat.dev/chains-wallets-plugins#plugins
        plugins: [
            sendETH(),
            // erc20({ tokens: [USDC] }),
            // coingecko({
            //     apiKey: getSetting("COINGECKO_API_KEY"),
            // }),
        ],
    });

    return {
        name: "[GOAT] Onchain Actions",
        description: "Mode integration plugin",
        providers: [getWalletProvider(walletClient)],
        evaluators: [],
        services: [],
        actions: actions,
    };
}

export default createGoatPlugin;
