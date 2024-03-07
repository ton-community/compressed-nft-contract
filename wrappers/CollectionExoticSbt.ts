import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type CollectionExoticSbtConfig = {};

export function collectionExoticSbtConfigToCell(config: CollectionExoticSbtConfig): Cell {
    return beginCell().endCell();
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
}
