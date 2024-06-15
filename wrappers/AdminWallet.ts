import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type AdminWalletConfig = {
    admin: Address,
    minBalance: bigint
};

export function adminWalletConfigToCell(config: AdminWalletConfig): Cell {
    return beginCell()
        .storeAddress(config.admin)
        .storeUint(config.minBalance, 32)
    .endCell();
}

export class AdminWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AdminWallet(address);
    }

    static createFromConfig(config: AdminWalletConfig, code: Cell, workchain = 0) {
        const data = adminWalletConfigToCell(config);
        const init = { code, data };
        return new AdminWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendFunds(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xa4d8086f, 32)
            .endCell(),
        });
    }

    async sendAdminWithdrawal(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x217e5898, 32)
            .endCell(),
        });
    }
}
