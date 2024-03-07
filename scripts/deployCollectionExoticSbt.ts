import { toNano } from 'ton-core';
import { CollectionExoticSbt } from '../wrappers/CollectionExoticSbt';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const collectionExoticSbt = provider.open(CollectionExoticSbt.createFromConfig({}, await compile('CollectionExoticSbt')));

    await collectionExoticSbt.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(collectionExoticSbt.address);

    // run methods on `collectionExoticSbt`
}
