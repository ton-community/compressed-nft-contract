import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from 'ton-core';

export type CollectionConfig = {
    root: bigint,
    depth: number,
    itemCode: Cell,
    owner: Address,
    content: Cell,
    royalty: Cell,
    apiVersion: number,
    apiLink: string,
};

export function collectionConfigToCell(config: CollectionConfig): Cell {
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

export type UpdateItem = { index: number, value: bigint, depth: number };

const UpdateItemValue: DictionaryValue<UpdateItem> = {
    serialize(src, builder) {
        builder.storeUint(src.index, 256).storeUint(src.value, 256)
    },
    parse(src) {
        throw '';
    },
};

function buildUpdateCell(updates: UpdateItem[], hashes: { index: number, value: bigint }[], index: number): Cell {
    const hash = hashes.find(h => h.index === index);
    if (hash !== undefined) {
        return beginCell().storeBit(true).storeBit(true).storeUint(hash.value, 256).endCell();
    }

    const update = updates.find(u => u.index === index);
    if (update !== undefined) {
        return beginCell().storeBit(true).storeBit(false).storeUint(update.value, 256).endCell();
    }

    const left = buildUpdateCell(updates, hashes, 2*index);
    const right = buildUpdateCell(updates, hashes, 2*index+1);

    return beginCell().storeBit(false).storeRef(left).storeRef(right).endCell();
}

export class CollectionNew implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new CollectionNew(address);
    }

    static createFromConfig(config: CollectionConfig, code: Cell, workchain = 0) {
        const data = collectionConfigToCell(config);
        const init = { code, data };
        return new CollectionNew(contractAddress(workchain, init), init);
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

    async sendClaim(provider: ContractProvider, via: Sender, params: {
        queryId?: bigint,
        index: bigint,
        data: Cell,
        proof: bigint[],
        value?: bigint,
    }) {
        const pb: Builder[] = params.proof.map(e => beginCell().storeUint(e, 256));
        let proofCell = new Cell();
        while (pb.length > 0) {
            proofCell = pb.pop()!.storeRef(proofCell).endCell();
        }

        await this.sendPremadeProof(provider, via, {
            queryId: params.queryId,
            value: params.value,
            index: params.index,
            proofCell: beginCell()
                .storeRef(params.data)
                .storeRef(proofCell)
                .endCell()
        });
    }

    async sendUpdate(provider: ContractProvider, via: Sender, params: {
        queryId?: bigint,
        updates: UpdateItem[],
        hashes: { index: number, value: bigint }[],
        value?: bigint,
    }) {
        const body = beginCell()
            .storeUint(0x23cd52c, 32)
            .storeUint(params.queryId ?? 0, 64)
            .storeRef(buildUpdateCell(params.updates, params.hashes, 1))
            .endCell();

        await provider.internal(via, {
            value: params.value ?? toNano('0.5'),
            bounce: true,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async getItemAddress(provider: ContractProvider, index: bigint) {
        const result = await provider.get('get_nft_address_by_index', [
            { type: 'int', value: index },
        ]);
        return result.stack.readAddress();
    }

    async getMerkleRoot(provider: ContractProvider) {
        const result = await provider.get('get_merkle_root', []);
        return result.stack.readBigNumber();
    }
}
