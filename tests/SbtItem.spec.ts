import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { SbtItem } from '../wrappers/SbtItem';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('SbtItem', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SbtItem');
    });

    let blockchain: Blockchain;
    let sbtItem: SandboxContract<SbtItem>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        sbtItem = blockchain.openContract(SbtItem.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await sbtItem.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sbtItem.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and sbtItem are ready to use
    });
});
