import { toNano } from 'ton-core';
import { Collection } from '../wrappers/Collection';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig({}, await compile('Collection')));

    await collection.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(collection.address);

    // run methods on `collection`
}
