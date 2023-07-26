import { toNano } from 'ton-core';
import { Item } from '../wrappers/Item';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const item = provider.open(Item.createFromConfig({}, await compile('Item')));

    await item.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(item.address);

    // run methods on `item`
}
