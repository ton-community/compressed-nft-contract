import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from 'ton-core';

export type CollectionConfig = {
    root: bigint,
    depth: number,
    itemCode: Cell,
    owner: Address,
    content: Cell,
    royalty: Cell,
    lastIndex: bigint,
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
        .storeUint(config.lastIndex, 256)
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

export class Collection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Collection(address);
    }

    static createFromConfig(config: CollectionConfig, code: Cell, workchain = 0) {
        const data = collectionConfigToCell(config);
        const init = { code, data };
        return new Collection(contractAddress(workchain, init), init);
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
        const proofDict = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256));

        for (let i = 0; i < params.proof.length; i++) {
            proofDict.set(i, params.proof[i]);
        }

        const pdb = beginCell();
        proofDict.storeDirect(pdb);

        await this.sendPremadeProof(provider, via, {
            queryId: params.queryId,
            value: params.value,
            proofCell: beginCell()
                .storeUint(params.index, 256)
                .storeRef(params.data)
                .storeRef(pdb)
                .endCell()
        });
    }

    async sendUpdate(provider: ContractProvider, via: Sender, params: {
        queryId?: bigint,
        newLastIndex: bigint,
        updates: UpdateItem[],
        hashes: { index: number, value: bigint }[],
        value?: bigint,
    }) {
        const updatesDict = Dictionary.empty(Dictionary.Keys.Uint(32), UpdateItemValue);
        params.updates.forEach(u => {
            updatesDict.set(u.depth, u);
        });

        const hashesDict = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256));
        params.hashes.forEach(h => {
            hashesDict.set(h.index, h.value);
        });

        const udb = beginCell();
        updatesDict.storeDirect(udb);

        const hdb = beginCell();
        hashesDict.storeDirect(hdb);

        const body = beginCell()
            .storeUint(0x23cd52c, 32)
            .storeUint(params.queryId ?? 0, 64)
            .storeRef(beginCell()
                .storeUint(params.newLastIndex, 256)
                .storeRef(udb)
                .storeRef(hdb))
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
