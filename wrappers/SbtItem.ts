import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type SbtItemConfig = {};

export function sbtItemConfigToCell(config: SbtItemConfig): Cell {
    return beginCell().endCell();
}

export class SbtItem implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SbtItem(address);
    }

    static createFromConfig(config: SbtItemConfig, code: Cell, workchain = 0) {
        const data = sbtItemConfigToCell(config);
        const init = { code, data };
        return new SbtItem(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
