import { Blockchain, SandboxContract, printTransactionFees } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { Collection, UpdateItem } from '../wrappers/Collection';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { MerkleTree, bufferToInt } from '../merkle/merkle';

const merkleHash = (a: bigint, b: bigint) => bufferToInt(beginCell().storeUint(a, 256).storeUint(b, 256).endCell().hash());

describe('Collection', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Collection');
    });

    let blockchain: Blockchain;
    let collection: SandboxContract<Collection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
    });

    it('should claim', async () => {
        const claimer = await blockchain.treasury('claimer');

        const data = beginCell().storeAddress(claimer.address).storeRef(new Cell()).endCell();
        const merkle = MerkleTree.fromLeaves([bufferToInt(data.hash()), 0n, 0n, 0n], merkleHash);

        const deployer = await blockchain.treasury('deployer');

        collection = blockchain.openContract(Collection.createFromConfig({
            root: merkle.root(),
            depth: merkle.depth,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            lastIndex: BigInt(Math.pow(2, merkle.depth) - 1),
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

        (await blockchain.getContract(collection.address)).verbosity = {
            vmLogs: 'none',
            print: true,
            debugLogs: true,
            blockchainLogs: false,
        };

        const itemAddress = await collection.getItemAddress(0n);

        const claimResult = await collection.sendClaim(claimer.getSender(), {
            index: 0n, data, proof: merkle.proofForNode(4)
        });

        expect(claimResult.transactions).toHaveTransaction({
            from: collection.address,
            on: itemAddress,
            success: true,
        });

        printTransactionFees(claimResult.transactions);
    });

    it('should update', async () => {
        const merkle = MerkleTree.fromLeaves([1n, 2n, 3n, 4n, 5n, 0n, 0n, 0n], merkleHash);

        const deployer = await blockchain.treasury('deployer');

        collection = blockchain.openContract(Collection.createFromConfig({
            root: merkle.root(),
            depth: merkle.depth,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            lastIndex: 4n,
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

        (await blockchain.getContract(collection.address)).verbosity = {
            vmLogs: 'none',
            print: true,
            debugLogs: true,
            blockchainLogs: false,
        };

        const upd = merkle.generateUpdate([6n, 7n, 0n]);

        const updRes = await collection.sendUpdate(deployer.getSender(), {
            newLastIndex: 6n,
            updates: upd.nodes,
            hashes: upd.proof,
        });

        printTransactionFees(updRes.transactions);

        const newRoot = await collection.getMerkleRoot();

        const merkle2 = MerkleTree.fromLeaves([1n, 2n, 3n, 4n, 5n, 6n, 7n, 0n], merkleHash);

        expect(newRoot).toEqual(merkle2.root());

        const upd2 = merkle2.generateUpdate([8n]);

        const upd2Res = await collection.sendUpdate(deployer.getSender(), {
            newLastIndex: 7n,
            updates: upd2.nodes,
            hashes: upd2.proof,
        });

        printTransactionFees(upd2Res.transactions);

        const newRoot2 = await collection.getMerkleRoot();

        const merkle22 = MerkleTree.fromLeaves([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n], merkleHash);

        expect(newRoot2).toEqual(merkle22.root());
    });

    it('should work with high levels', async () => {
        const levels = 30;

        const deployer = await blockchain.treasury('deployer');

        const data = beginCell()
            .storeAddress(deployer.address)
            .storeRef(new Cell())
            .endCell();

        let curHash = bufferToInt(data.hash());
        let zeroHash = 0n;
        let zhs = [zeroHash];
        for (let i = 0; i < levels; i++) {
            curHash = merkleHash(curHash, zeroHash);
            zeroHash = merkleHash(zeroHash, zeroHash);
            zhs.push(zeroHash);
        }

        zhs.pop();

        collection = blockchain.openContract(Collection.createFromConfig({
            root: curHash,
            depth: levels,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            lastIndex: 0n,
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

        const claimResult = await collection.sendClaim(deployer.getSender(), {
            index: 0n,
            data,
            proof: zhs,
            value: toNano('2'),
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

        let curHash = bufferToInt(data.hash());
        let zeroHash = 0n;
        let zhs = [zeroHash];
        for (let i = 0; i < levels; i++) {
            curHash = merkleHash(curHash, zeroHash);
            zeroHash = merkleHash(zeroHash, zeroHash);
            zhs.push(zeroHash);
        }

        zhs.pop();

        collection = blockchain.openContract(Collection.createFromConfig({
            root: curHash,
            depth: levels,
            itemCode: await compile('Item'),
            owner: deployer.address,
            content: new Cell(),
            royalty: new Cell(),
            lastIndex: 0n,
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

        const updates: UpdateItem[] = [{ index: (1 << levels) + 1, value: bufferToInt(data2.hash()), depth: levels }];

        for (let i = 1; i < levels; i++) {
            updates.push({ index: (updates[i-1].index >> 1) + 1, value: zhs[i], depth: updates[i-1].depth - 1 });
        }

        const updateResult = await collection.sendUpdate(deployer.getSender(), {
            updates,
            hashes: [{ index: (1 << levels), value: bufferToInt(data.hash()) }],
            newLastIndex: 1n,
            value: toNano('1'),
        });

        expect(updateResult.transactions).toHaveTransaction({
            on: collection.address,
            success: true,
        });

        printTransactionFees(updateResult.transactions);
    });
});
