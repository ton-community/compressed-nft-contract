import { toNano } from 'ton-core';
import { SbtItem } from '../wrappers/SbtItem';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const sbtItem = provider.open(SbtItem.createFromConfig({}, await compile('SbtItem')));

    await sbtItem.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(sbtItem.address);

    // run methods on `sbtItem`
}
