import { Tool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { parseUnits } from "viem";
import { encodeAbiParameters } from "viem";
import { ERC20_ABI } from "./abi/erc20";
import { KIM_FACTORY_ABI } from "./abi/factory";
import { POOL_ABI } from "./abi/pool";
import { CALCULATOR_ABI } from "./abi/calculator";
import { POSITION_MANAGER_ABI } from "./abi/positionManager";
import { SWAP_ROUTER_ABI } from "./abi/swaprouter";
import {
    BurnParams,
    CollectParams,
    DecreaseLiquidityParams,
    ExactInputParams,
    ExactInputSingleParams,
    ExactOutputParams,
    ExactOutputSingleParams,
    GetSwapRouterAddressParams,
    GlobalStateResponseParams,
    IncreaseLiquidityParams,
    MintParams,
} from "./parameters";

const SWAP_ROUTER_ADDRESS = "0xAc48FcF1049668B285f3dC72483DF5Ae2162f7e8";
const POSITION_MANAGER_ADDRESS = "0x2e8614625226D26180aDf6530C3b1677d3D7cf10";
const FACTORY_ADDRESS = "0xB5F00c2C5f8821155D8ed27E31932CFD9DB3C5D5";
const CALCULATOR_ADDRESS = "0x6f8E2B58373aB12Be5f7c28658633dD27D689f0D";

export class KimService {
    @Tool({
        name: "kim_get_swap_router_address",
        description: "Get the address of the swap router",
    })
    async getSwapRouterAddress(parameters: GetSwapRouterAddressParams) {
        return SWAP_ROUTER_ADDRESS;
    }

    @Tool({
        description:
            "Swap an exact amount of input tokens for an output token in a single hop. Have the token amounts in their base units. Don't need to approve the swap router for the output token. User will have sufficient balance of the input token. The swap router address is already provided in the function. Returns a transaction hash on success. Once you get a transaction hash, the swap is complete - do not call this function again.",
    })
    async swapExactInputSingleHop(
        walletClient: EVMWalletClient,
        parameters: ExactInputSingleParams
    ) {
        try {
            console.log("Starting swapExactInputSingleHop with parameters:", {
                tokenIn: parameters.tokenInAddress,
                tokenOut: parameters.tokenOutAddress,
                amountIn: parameters.amountIn.toString(),
                amountOutMin: parameters.amountOutMinimum.toString(),
            });

            // Approval step
            console.log("Approving token spend...");
            const approvalHash = await walletClient.sendTransaction({
                to: parameters.tokenInAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [SWAP_ROUTER_ADDRESS, parameters.amountIn],
            });
            console.log("Approval transaction hash:", approvalHash);

            const timestamp =
                Math.floor(Date.now() / 1000) + parameters.deadline;
            console.log("Swap deadline timestamp:", timestamp);

            // Swap step
            console.log("Executing swap transaction...");
            const hash = await walletClient.sendTransaction({
                to: SWAP_ROUTER_ADDRESS,
                abi: SWAP_ROUTER_ABI,
                functionName: "exactInputSingle",
                args: [
                    {
                        tokenIn: parameters.tokenInAddress,
                        tokenOut: parameters.tokenOutAddress,
                        recipient: walletClient.getAddress(),
                        deadline: timestamp,
                        amountIn: parameters.amountIn,
                        amountOutMinimum: parameters.amountOutMinimum,
                        limitSqrtPrice: BigInt(0),
                    },
                ],
            });
            console.log("Swap transaction hash:", hash.hash);

            return hash.hash;
        } catch (error) {
            console.error("Error in swapExactInputSingleHop:", error);
            throw Error(`Failed to swap exact input single hop: ${error}`);
        }
    }

    @Tool({
        name: "kim_swap_exact_output_single_hop",
        description:
            "Swap an exact amount of output tokens for a single hop. Have the token amounts in their base units. Don't need to approve the swap router for the output token. User will have sufficient balance of the input token. The swap router address is already provided in the function. Returns a transaction hash on success. Once you get a transaction hash, the swap is complete - do not call this function again.",
    })
    async swapExactOutputSingleHop(
        walletClient: EVMWalletClient,
        parameters: ExactOutputSingleParams
    ): Promise<string> {
        try {
            const tokenIn = parameters.tokenInAddress;
            const tokenOut = parameters.tokenOutAddress;

            const amountOut = parameters.amountOut;
            const amountInMaximum = parameters.amountInMaximum;
            const limitSqrtPrice = parameters.limitSqrtPrice;
            const timestamp =
                Math.floor(Date.now() / 1000) + parameters.deadline;

            const approvalHash = await walletClient.sendTransaction({
                to: parameters.tokenInAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [SWAP_ROUTER_ADDRESS, amountInMaximum],
            });

            const hash = await walletClient.sendTransaction({
                to: SWAP_ROUTER_ADDRESS,
                abi: SWAP_ROUTER_ABI,
                functionName: "exactOutputSingle",
                args: [
                    {
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        recipient: walletClient.getAddress(),
                        deadline: timestamp,
                        amountOut: amountOut,
                        amountInMaximum: amountInMaximum,
                        limitSqrtPrice: limitSqrtPrice,
                    },
                ],
            });

            return hash.hash;
        } catch (error) {
            throw Error(`Failed to swap exact output single hop: ${error}`);
        }
    }

    @Tool({
        name: "kim_swap_exact_input_multi_hop",
        description: "Swap an exact amount of input tokens in multiple hops",
    })
    async swapExactInputMultiHop(
        walletClient: EVMWalletClient,
        parameters: ExactInputParams
    ): Promise<string> {
        try {
            const recipient = await walletClient.resolveAddress(
                parameters.recipient
            );

            // Get first and last token decimals
            const tokenInDecimals = Number(
                await walletClient.read({
                    address: parameters.path.tokenIn as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                })
            );

            const tokenOutDecimals = Number(
                await walletClient.read({
                    address: parameters.path.tokenOut as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                })
            );

            // Encode the path
            const encodedPath = encodeAbiParameters(
                [{ type: "address[]" }, { type: "uint24[]" }],
                [
                    [
                        parameters.path.tokenIn as `0x${string}`,
                        ...parameters.path.intermediateTokens.map(
                            (t: string) => t as `0x${string}`
                        ),
                        parameters.path.tokenOut as `0x${string}`,
                    ],
                    parameters.path.fees,
                ]
            );

            const hash = await walletClient.sendTransaction({
                to: SWAP_ROUTER_ADDRESS,
                abi: SWAP_ROUTER_ABI,
                functionName: "exactInput",
                args: [
                    encodedPath,
                    recipient,
                    parameters.deadline,
                    parseUnits(parameters.amountIn, tokenInDecimals),
                    parseUnits(parameters.amountOutMinimum, tokenOutDecimals),
                ],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to swap: ${error}`);
        }
    }

    @Tool({
        name: "kim_swap_exact_output_multi_hop",
        description:
            "Swap tokens to receive an exact amount of output tokens in multiple hops",
    })
    async swapExactOutputMultiHop(
        walletClient: EVMWalletClient,
        parameters: ExactOutputParams
    ): Promise<string> {
        try {
            const recipient = await walletClient.resolveAddress(
                parameters.recipient
            );

            // Get first and last token decimals
            const tokenInDecimals = Number(
                await walletClient.read({
                    address: parameters.path.tokenIn as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                })
            );

            const tokenOutDecimals = Number(
                await walletClient.read({
                    address: parameters.path.tokenOut as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                })
            );

            // Encode the path
            const encodedPath = encodeAbiParameters(
                [{ type: "address[]" }, { type: "uint24[]" }],
                [
                    [
                        parameters.path.tokenIn as `0x${string}`,
                        ...parameters.path.intermediateTokens.map(
                            (t: string) => t as `0x${string}`
                        ),
                        parameters.path.tokenOut as `0x${string}`,
                    ],
                    parameters.path.fees,
                ]
            );

            const hash = await walletClient.sendTransaction({
                to: SWAP_ROUTER_ADDRESS,
                abi: SWAP_ROUTER_ABI,
                functionName: "exactOutput",
                args: [
                    encodedPath,
                    recipient,
                    parameters.deadline,
                    parseUnits(parameters.amountOut, tokenOutDecimals),
                    parseUnits(parameters.amountInMaximum, tokenInDecimals),
                ],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to swap: ${error}`);
        }
    }

    @Tool({
        name: "kim_mint_position",
        description: "Mint a new liquidity position in a pool...",
    })
    async mintPosition(
        walletClient: EVMWalletClient,
        parameters: MintParams
    ): Promise<string> {
        try {
            console.log("🚀 Starting mintPosition with parameters:", {
                token0Address: parameters.token0Address,
                token1Address: parameters.token1Address,
                amount0Desired: parameters.amount0Desired.toString(),
                amount1Desired: parameters.amount1Desired.toString(),
                riskLevel: parameters.riskLevel,
                deadline: parameters.deadline,
            });

            // Get pool address
            console.log("🔍 Fetching pool address for pair...");
            const poolAddressResult = await walletClient.read({
                address: FACTORY_ADDRESS as `0x${string}`,
                abi: KIM_FACTORY_ABI,
                functionName: "poolByPair",
                args: [parameters.token0Address, parameters.token1Address],
            });
            const poolAddress = (poolAddressResult as { value: string }).value;
            console.log("✅ Pool found:", { poolAddress });

            // Get actual pool tokens
            console.log("🔍 Fetching pool token addresses...");
            const token0Result = await walletClient.read({
                address: poolAddress as `0x${string}`,
                abi: POOL_ABI,
                functionName: "token0",
            });
            const token1Result = await walletClient.read({
                address: poolAddress as `0x${string}`,
                abi: POOL_ABI,
                functionName: "token1",
            });

            const poolToken0 = (token0Result as { value: string }).value;
            const poolToken1 = (token1Result as { value: string }).value;

            // Check if parameters match pool order
            const isOrderMatched =
                parameters.token0Address.toLowerCase() ===
                poolToken0.toLowerCase();
            console.log("🔄 Token ordering:", {
                isOrderMatched,
                poolToken0,
                poolToken1,
                paramToken0: parameters.token0Address,
                paramToken1: parameters.token1Address,
            });

            // Set tokens and amounts in correct order
            const [token0, token1] = isOrderMatched
                ? [parameters.token0Address, parameters.token1Address]
                : [parameters.token1Address, parameters.token0Address];
            const [amount0Raw, amount1Raw] = isOrderMatched
                ? [parameters.amount0Desired, parameters.amount1Desired]
                : [parameters.amount1Desired, parameters.amount0Desired];
            console.log("📋 Ordered tokens and amounts:", {
                token0,
                token1,
                amount0Raw: amount0Raw.toString(),
                amount1Raw: amount1Raw.toString(),
            });

            // Calculate optimal amounts
            console.log(
                "🧮 Calculating optimal amounts with risk level:",
                parameters.riskLevel
            );
            const calculatorResult = await walletClient.read({
                address: CALCULATOR_ADDRESS as `0x${string}`,
                abi: CALCULATOR_ABI,
                functionName: "calculateOptimalAmounts",
                args: [
                    poolAddress,
                    amount0Raw,
                    amount1Raw,
                    parameters.riskLevel,
                ],
            });
            const {
                value: [optimalAmount0, optimalAmount1, tickLower, tickUpper],
            } = calculatorResult as {
                value: [bigint, bigint, number, number];
            };
            console.log("📊 Optimization results:", {
                optimalAmount0: optimalAmount0.toString(),
                optimalAmount1: optimalAmount1.toString(),
                tickLower,
                tickUpper,
                tickSpread: tickUpper - tickLower,
            });

            // Approvals
            console.log("🔓 Starting token approvals...");
            const approvalHash0 = await walletClient.sendTransaction({
                to: token0 as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [POSITION_MANAGER_ADDRESS, optimalAmount0],
            });
            console.log("✅ Token0 approved:", {
                token: token0,
                amount: optimalAmount0.toString(),
                hash: approvalHash0,
            });

            const approvalHash1 = await walletClient.sendTransaction({
                to: token1 as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [POSITION_MANAGER_ADDRESS, optimalAmount1],
            });
            console.log("✅ Token1 approved:", {
                token: token1,
                amount: optimalAmount1.toString(),
                hash: approvalHash1,
            });

            // Mint
            const timestamp =
                Math.floor(Date.now() / 1000) + parameters.deadline;
            console.log(
                "⏰ Minting with deadline:",
                new Date(timestamp * 1000).toISOString()
            );

            const hash = await walletClient.sendTransaction({
                to: POSITION_MANAGER_ADDRESS,
                abi: POSITION_MANAGER_ABI,
                functionName: "mint",
                args: [
                    {
                        token0,
                        token1,
                        tickLower,
                        tickUpper,
                        amount0Desired: optimalAmount0,
                        amount1Desired: optimalAmount1,
                        amount0Min: 0,
                        amount1Min: 0,
                        recipient: walletClient.getAddress(),
                        deadline: timestamp,
                    },
                ],
            });
            console.log("🎉 Position minted successfully!", {
                hash: hash.hash,
                token0,
                token1,
                amount0: optimalAmount0.toString(),
                amount1: optimalAmount1.toString(),
                tickRange: `${tickLower} to ${tickUpper}`,
            });

            return hash.hash;
        } catch (error) {
            console.error("❌ Error in mintPosition:", {
                error,
                step: "Failed step will be shown in stack trace",
                params: {
                    token0Address: parameters.token0Address,
                    token1Address: parameters.token1Address,
                    riskLevel: parameters.riskLevel,
                },
            });
            throw new Error(`Failed to mint position: ${error}`);
        }
    }

    @Tool({
        name: "kim_increase_liquidity",
        description:
            "Increase liquidity in an existing position. Returns a transaction hash on success. Once you get a transaction hash, the increase is complete - do not call this function again.",
    })
    async increaseLiquidity(
        walletClient: EVMWalletClient,
        parameters: IncreaseLiquidityParams
    ): Promise<string> {
        try {
            // Set tokens and amounts in correct order
            const isOrderMatched =
                parameters.token0Address.toLowerCase() <
                parameters.token1Address.toLowerCase();

            const [token0, token1] = isOrderMatched
                ? [parameters.token0Address, parameters.token1Address]
                : [parameters.token1Address, parameters.token0Address];

            const [amount0Raw, amount1Raw] = isOrderMatched
                ? [parameters.amount0Desired, parameters.amount1Desired]
                : [parameters.amount1Desired, parameters.amount0Desired];

            const approvalHash0 = await walletClient.sendTransaction({
                to: token0 as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [POSITION_MANAGER_ADDRESS, amount0Raw],
            });

            const approvalHash1 = await walletClient.sendTransaction({
                to: token1 as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [POSITION_MANAGER_ADDRESS, amount1Raw],
            });

            // Calculate deadline as current time + deadline seconds
            const timestamp = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now

            const hash = await walletClient.sendTransaction({
                to: POSITION_MANAGER_ADDRESS,
                abi: POSITION_MANAGER_ABI,
                functionName: "increaseLiquidity",
                args: [
                    {
                        tokenId: parameters.tokenId,
                        amount0Desired: amount0Raw,
                        amount1Desired: amount1Raw,
                        amount0Min: 0n,
                        amount1Min: 0n,
                        deadline: timestamp,
                    },
                ],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to increase liquidity: ${error}`);
        }
    }

    @Tool({
        name: "kim_decrease_liquidity",
        description:
            "Decrease liquidity in an existing position by specifying a percentage (0-100). Returns a transaction hash on success. Once you get a transaction hash, the decrease is complete - do not call this function again.",
    })
    async decreaseLiquidity(
        walletClient: EVMWalletClient,
        parameters: DecreaseLiquidityParams
    ): Promise<string> {
        try {
            // Get position info
            const positionResult = await walletClient.read({
                address: POSITION_MANAGER_ADDRESS as `0x${string}`,
                abi: POSITION_MANAGER_ABI,
                functionName: "positions",
                args: [parameters.tokenId],
            });
            const position = (positionResult as { value: any[] }).value;

            const currentLiquidity = position[6];
            const liquidityToRemove =
                (currentLiquidity * BigInt(parameters.percentage)) /
                BigInt(100);

            // Set min amounts to 0 for now
            const amount0Min = 0n;
            const amount1Min = 0n;

            const timestamp = Math.floor(Date.now() / 1000) + 60;

            const hash = await walletClient.sendTransaction({
                to: POSITION_MANAGER_ADDRESS,
                abi: POSITION_MANAGER_ABI,
                functionName: "decreaseLiquidity",
                args: [
                    {
                        tokenId: parameters.tokenId,
                        liquidity: liquidityToRemove,
                        amount0Min: amount0Min,
                        amount1Min: amount1Min,
                        deadline: timestamp,
                    },
                ],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to decrease liquidity: ${error}`);
        }
    }

    @Tool({
        name: "kim_collect",
        description:
            "Collect all available tokens from a liquidity position. Can be rewards or tokens removed from a liquidity position. So, should be called after decreasing liquidity as well as on its own.",
    })
    async collect(
        walletClient: EVMWalletClient,
        parameters: CollectParams
    ): Promise<string> {
        try {
            const recipient = walletClient.getAddress();
            // Use max uint128 to collect all available tokens
            const maxUint128 = BigInt(2 ** 128) - BigInt(1);

            const hash = await walletClient.sendTransaction({
                to: POSITION_MANAGER_ADDRESS,
                abi: POSITION_MANAGER_ABI,
                functionName: "collect",
                args: [
                    {
                        tokenId: parameters.tokenId,
                        recipient,
                        amount0Max: maxUint128,
                        amount1Max: maxUint128,
                    },
                ],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to collect: ${error}`);
        }
    }

    @Tool({
        name: "kim_burn",
        description:
            "Burn a liquidity position NFT after all tokens have been collected.",
    })
    async burn(
        walletClient: EVMWalletClient,
        parameters: BurnParams
    ): Promise<string> {
        try {
            const hash = await walletClient.sendTransaction({
                to: POSITION_MANAGER_ADDRESS,
                abi: POSITION_MANAGER_ABI,
                functionName: "burn",
                args: [parameters.tokenId],
            });

            return hash.hash;
        } catch (error) {
            throw new Error(`Failed to burn position: ${error}`);
        }
    }
}
