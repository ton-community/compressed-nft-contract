import { Blockchain, SandboxContract, createShardAccount } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { CollectionExoticSbt } from '../wrappers/CollectionExoticSbt';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from '@ton-community/test-utils';

describe('CollectionExoticSbt', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CollectionExoticSbt');
    });

    let blockchain: Blockchain;
    let collectionExoticSbt: SandboxContract<CollectionExoticSbt>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        collectionExoticSbt = blockchain.openContract(CollectionExoticSbt.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await collectionExoticSbt.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collectionExoticSbt.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and collectionExoticSbt are ready to use
    });
});
