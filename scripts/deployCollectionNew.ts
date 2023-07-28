import { toNano } from 'ton-core';
import { CollectionNew } from '../wrappers/CollectionNew';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const collectionNew = provider.open(CollectionNew.createFromConfig({}, await compile('CollectionNew')));

    await collectionNew.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(collectionNew.address);

    // run methods on `collectionNew`
}
