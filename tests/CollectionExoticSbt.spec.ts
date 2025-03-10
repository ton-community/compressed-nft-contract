import { Blockchain, SandboxContract, printTransactionFees } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { CollectionExoticSbt } from '../wrappers/CollectionExoticSbt';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

function convertToPrunedBranch(c: Cell): Cell {
    return new Cell({
        exotic: true,
        bits: beginCell()
            .storeUint(1, 8)
            .storeUint(1, 8)
            .storeBuffer(c.hash(0))
            .storeUint(c.depth(0), 16)
            .endCell()
            .beginParse()
            .loadBits(288),
    });
}

function convertToMerkleProof(c: Cell): Cell {
    return new Cell({
        exotic: true,
        bits: beginCell()
            .storeUint(3, 8)
            .storeBuffer(c.hash(0))
            .storeUint(c.depth(0), 16)
            .endCell()
            .beginParse()
            .loadBits(280),
        refs: [c],
    });
}

const zeroPB = new Cell({
    exotic: true,
    bits: beginCell().storeUint(1, 8).storeUint(1, 8).storeBuffer(Buffer.alloc(32)).storeUint(0, 16).endCell().beginParse().loadBits(288),
});

describe('CollectionExoticSbt', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CollectionExoticSbt');
    });

    let blockchain: Blockchain;
    let collectionExoticSbt: SandboxContract<CollectionExoticSbt>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
    });

    it('should claim', async () => {
        const deployer = await blockchain.treasury('deployer');
        const claimer = await blockchain.treasury('claimer');

        const data = beginCell()
            .storeAddress(claimer.address)
            .storeRef(new Cell())
            .storeAddress(deployer.address)
            .endCell();
        const tree = beginCell()
            .storeRef(beginCell()
                .storeRef(data)
                .storeRef(zeroPB))
            .storeRef(beginCell()
                .storeRef(zeroPB)
                .storeRef(zeroPB))
            .endCell();

        const merkle = convertToMerkleProof(beginCell()
            .storeRef(tree.refs[0])
            .storeRef(convertToPrunedBranch(tree.refs[1]))
            .endCell());

        collectionExoticSbt = blockchain.openContract(CollectionExoticSbt.createFromConfig({
            root: BigInt('0x' + tree.hash(0).toString('hex')),
            depth: 2,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            apiVersion: 1,
            apiLink: '',
        }, code));

        const deployResult = await collectionExoticSbt.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collectionExoticSbt.address,
            deploy: true,
            success: true,
        });

        const itemAddress = await collectionExoticSbt.getItemAddress(0n);

        const claimResult = await collectionExoticSbt.sendPremadeProof(claimer.getSender(), {
            index: 0n,
            proofCell: merkle,
        });

        printTransactionFees(claimResult.transactions);

        expect(claimResult.transactions).toHaveTransaction({
            from: collectionExoticSbt.address,
            on: itemAddress,
            success: true,
        });
    });
});
