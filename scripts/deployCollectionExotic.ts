import { toNano } from 'ton-core';
import { CollectionExotic } from '../wrappers/CollectionExotic';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const collectionExotic = provider.open(CollectionExotic.createFromConfig({}, await compile('CollectionExotic')));

    await collectionExotic.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(collectionExotic.address);

    // run methods on `collectionExotic`
}
