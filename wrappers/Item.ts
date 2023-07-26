import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type ItemConfig = {};

export function itemConfigToCell(config: ItemConfig): Cell {
    return beginCell().endCell();
}

export class Item implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Item(address);
    }

    static createFromConfig(config: ItemConfig, code: Cell, workchain = 0) {
        const data = itemConfigToCell(config);
        const init = { code, data };
        return new Item(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
