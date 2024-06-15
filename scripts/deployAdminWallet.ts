import { toNano, Address } from '@ton/core';
import { AdminWallet } from '../wrappers/AdminWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const adminWallet = provider.open(AdminWallet.createFromConfig({
        admin: provider.sender().address as Address,
        minBalance: toNano('0.5')
    }, await compile('AdminWallet')));

    await adminWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(adminWallet.address);

    // run methods on `adminWallet`
}
