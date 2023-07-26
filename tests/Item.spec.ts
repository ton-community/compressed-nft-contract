import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Item } from '../wrappers/Item';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Item', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Item');
    });

    let blockchain: Blockchain;
    let item: SandboxContract<Item>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        item = blockchain.openContract(Item.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await item.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: item.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and item are ready to use
    });
});
