import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from 'ton-core';

export type CollectionExoticSbtConfig = {
    root: bigint,
    depth: number,
    itemCode: Cell,
    owner: Address,
    content: Cell,
    royalty: Cell,
    apiVersion: number,
    apiLink: string,
};

export function collectionExoticSbtConfigToCell(config: CollectionExoticSbtConfig): Cell {
    return beginCell()
        .storeUint(config.root, 256)
        .storeUint(config.depth, 8)
        .storeRef(config.itemCode)
        .storeAddress(config.owner)
        .storeRef(config.content)
        .storeRef(config.royalty)
        .storeRef(beginCell()
            .storeUint(config.apiVersion, 8)
            .storeRef(beginCell().storeStringTail(config.apiLink)))
        .endCell();
}
export class CollectionExoticSbt implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new CollectionExoticSbt(address);
    }

    static createFromConfig(config: CollectionExoticSbtConfig, code: Cell, workchain = 0) {
        const data = collectionExoticSbtConfigToCell(config);
        const init = { code, data };
        return new CollectionExoticSbt(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendPremadeProof(provider: ContractProvider, via: Sender, params: {
        queryId?: bigint,
        index: bigint,
        proofCell: Cell,
        value?: bigint,
    }) {
        await provider.internal(via, {
            value: params.value ?? toNano('0.1'),
            bounce: true,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x13a3ca6, 32)
                .storeUint(params.queryId ?? 0, 64)
                .storeUint(params.index, 256)
                .storeRef(params.proofCell)
                .endCell(),
        });
    }

    async getItemAddress(provider: ContractProvider, index: bigint) {
        const result = await provider.get('get_nft_address_by_index', [
            { type: 'int', value: index },
        ]);
        return result.stack.readAddress();
    }
}
