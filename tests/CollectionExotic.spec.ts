import { Blockchain, SandboxContract, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, Dictionary, beginCell, toNano } from 'ton-core';
import { CollectionExotic } from '../wrappers/CollectionExotic';
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

// function makePrunedNode(l: Cell, r: Cell): Cell {
//     return convertToPrunedBranch(beginCell().storeRef(l).storeRef(r).endCell());
// }

function makeZeroHashesDict(levels: number) {
    const dict = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Buffer(32));
    let cur = zeroPB;
    for (let i = 0; i < levels; i++) {
        dict.set(i, cur.hash());
        cur = convertToPrunedBranch(beginCell().storeRef(cur).storeRef(cur).endCell());
    }
    return beginCell().storeDictDirect(dict).endCell();
}

describe('CollectionExotic', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CollectionExotic');
    });

    let blockchain: Blockchain;
    let collection: SandboxContract<CollectionExotic>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
    });

    it('should claim', async () => {
        const claimer = await blockchain.treasury('claimer');

        const data = beginCell().storeAddress(claimer.address).storeRef(new Cell()).endCell();

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

        const deployer = await blockchain.treasury('deployer');

        collection = blockchain.openContract(CollectionExotic.createFromConfig({
            root: BigInt('0x' + tree.hash(0).toString('hex')),
            depth: 2,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            apiVersion: 1,
            apiLink: '',
        }, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });

        const itemAddress = await collection.getItemAddress(0n);

        const claimResult = await collection.sendPremadeProof(claimer.getSender(), {
            index: 0n,
            proofCell: merkle,
        });

        expect(claimResult.transactions).toHaveTransaction({
            from: collection.address,
            on: itemAddress,
            success: true,
        });

        printTransactionFees(claimResult.transactions);
    });

    it('should update', async () => {
        const claimer = await blockchain.treasury('claimer');

        const data = beginCell().storeAddress(claimer.address).storeRef(new Cell()).endCell();

        const tree = beginCell()
            .storeRef(beginCell()
                .storeRef(data)
                .storeRef(zeroPB))
            .storeRef(beginCell()
                .storeRef(zeroPB)
                .storeRef(zeroPB))
            .endCell();

        const deployer = await blockchain.treasury('deployer');

        collection = blockchain.openContract(CollectionExotic.createFromConfig({
            root: BigInt('0x' + tree.hash(0).toString('hex')),
            depth: 2,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            apiVersion: 1,
            apiLink: '',
        }, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });

        const old = convertToMerkleProof(beginCell()
            .storeRef(beginCell().storeRef(convertToPrunedBranch(data)).storeRef(zeroPB))
            .storeRef(convertToPrunedBranch(tree.refs[1]))
            .endCell());

        const neww = convertToMerkleProof(beginCell()
            .storeRef(beginCell()
                .storeRef(convertToPrunedBranch(data))
                .storeRef(convertToPrunedBranch(data)))
            .storeRef(convertToPrunedBranch(tree.refs[1]))
            .endCell());

        const updateResult = await collection.sendPremadeUpdate(deployer.getSender(), {
            updateCell: beginCell().storeRef(old).storeRef(neww).endCell(),
        });

        expect(updateResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            success: true,
        });

        const root = await collection.getMerkleRoot();

        expect(root).toEqual(BigInt('0x' + neww.refs[0].hash(0).toString('hex')));
    });

    it('should work with high levels', async () => {
        const levels = 30;

        const deployer = await blockchain.treasury('deployer');

        const data = beginCell()
            .storeAddress(deployer.address)
            .storeRef(new Cell())
            .endCell();

        let curNode = data;
        let zeroNode = zeroPB;
        let zns = [zeroNode];
        for (let i = 0; i < levels; i++) {
            curNode = beginCell().storeRef(curNode).storeRef(zeroNode).endCell();
            zeroNode = convertToPrunedBranch(beginCell().storeRef(zeroNode).storeRef(zeroNode).endCell());
            zns.push(zeroNode);
        }

        zns.pop();

        collection = blockchain.openContract(CollectionExotic.createFromConfig({
            root: BigInt('0x' + curNode.hash(0).toString('hex')),
            depth: levels,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            apiVersion: 1,
            apiLink: '',
        }, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });

        const merkle = convertToMerkleProof(curNode);

        const claimResult = await collection.sendPremadeProof(deployer.getSender(), {
            index: 0n,
            proofCell: merkle,
        });

        expect(claimResult.transactions).toHaveTransaction({
            on: collection.address,
            success: true,
        });

        printTransactionFees(claimResult.transactions);
    });

    it('should update with high levels', async () => {
        const levels = 30;

        const deployer = await blockchain.treasury('deployer');

        const data = beginCell()
            .storeAddress(deployer.address)
            .storeRef(new Cell())
            .endCell();

        let curNode = data;
        let zeroNode = zeroPB;
        let zns = [zeroNode];
        for (let i = 0; i < levels; i++) {
            curNode = beginCell().storeRef(curNode).storeRef(zeroNode).endCell();
            zeroNode = convertToPrunedBranch(beginCell().storeRef(zeroNode).storeRef(zeroNode).endCell());
            zns.push(zeroNode);
        }

        zns.pop();

        collection = blockchain.openContract(CollectionExotic.createFromConfig({
            root: BigInt('0x' + curNode.hash(0).toString('hex')),
            depth: levels,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            apiVersion: 1,
            apiLink: '',
        }, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });

        const data2 = beginCell()
            .storeAddress(deployer.address)
            .storeRef(beginCell().storeUint(1, 8))
            .endCell();

        let old = beginCell()
            .storeRef(convertToPrunedBranch(data))
            .storeRef(zeroPB)
            .endCell();
        let neww = beginCell()
            .storeRef(convertToPrunedBranch(data))
            .storeRef(convertToPrunedBranch(data2))
            .endCell();

        for (let i = 1; i < levels; i++) {
            old = beginCell()
                .storeRef(old)
                .storeRef(zns[i])
                .endCell();
            neww = beginCell()
                .storeRef(neww)
                .storeRef(zns[i])
                .endCell();
        }

        const updateResult = await collection.sendPremadeUpdate(deployer.getSender(), {
            updateCell: beginCell().storeRef(convertToMerkleProof(old)).storeRef(convertToMerkleProof(neww)).endCell(),
            value: toNano('1'),
        });

        expect(updateResult.transactions).toHaveTransaction({
            from: deployer.address,
            on: collection.address,
            success: true,
        });

        printTransactionFees(updateResult.transactions);
    });
});
