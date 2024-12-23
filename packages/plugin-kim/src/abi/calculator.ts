export const CALCULATOR_ABI = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "tickOutOfRange",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "pool",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount0Max",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "amount1Max",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "strategyLevel",
                type: "uint8",
            },
        ],
        name: "calculateOptimalAmounts",
        outputs: [
            {
                internalType: "uint256",
                name: "amount0",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "amount1",
                type: "uint256",
            },
            {
                internalType: "int24",
                name: "tickLower",
                type: "int24",
            },
            {
                internalType: "int24",
                name: "tickUpper",
                type: "int24",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint8",
                name: "strategyLevel",
                type: "uint8",
            },
            {
                internalType: "uint16",
                name: "tickRange",
                type: "uint16",
            },
        ],
        name: "setStrategyTickRange",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        name: "strategyTickRanges",
        outputs: [
            {
                internalType: "uint16",
                name: "",
                type: "uint16",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;
