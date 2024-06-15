import {Blockchain, printTransactionFees, SandboxContract, TreasuryContract} from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { AdminWallet } from '../wrappers/AdminWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('AdminWallet', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AdminWallet');
        minBalanceAmount = toNano('0.5');
        minAcceptAmount = toNano('2');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let adminWallet: SandboxContract<AdminWallet>;
    let admin: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let minBalanceAmount: bigint;
    let minAcceptAmount: bigint;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');

        adminWallet = blockchain.openContract(AdminWallet.createFromConfig({
            admin: admin.address,
            min_balance: minBalanceAmount,
            min_accept_amount: minAcceptAmount,
        }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await adminWallet.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: adminWallet.address,
            deploy: true,
            success: true,
        });
    });

    async function sendUserFunds(amount: bigint) {
        return adminWallet.sendFunds(user.getSender(), amount);
    }

    it('should send funds', async () => {
        const sendAmount = minAcceptAmount + toNano('1');

        const userBalanceBefore = await user.getBalance();

        const sendFundsResult = await sendUserFunds(sendAmount);
        expect(sendFundsResult.transactions).toHaveTransaction({
            from: user.address,
            to: adminWallet.address,
            op: 0xa4d8086f,
            value: sendAmount,
            success: true,
        });

        const userBalanceAfter = await user.getBalance();

        expect(userBalanceAfter).toBeLessThan(userBalanceBefore - sendAmount);

        printTransactionFees(sendFundsResult.transactions);
    });

    it('should throw 400 if msg_value is less than min_accept_amount', async() => {
        const sendAmount = minAcceptAmount - BigInt(1);

        const userBalanceBefore = await user.getBalance();

        const sendFundsResult = await sendUserFunds(sendAmount);
        expect(sendFundsResult.transactions).toHaveTransaction({
            from: user.address,
            to: adminWallet.address,
            op: 0xa4d8086f,
            value: sendAmount,
            exitCode: 400,
            success: false
        });
        expect(sendFundsResult.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: user.address,
            success: true
        });

        const userBalanceAfter = await user.getBalance();

        expect(userBalanceAfter).toBeLessThan(userBalanceBefore);

        printTransactionFees(sendFundsResult.transactions);
    });

    it ('should admin withdraw with balance > min_balance', async() => {
        await sendUserFunds(minAcceptAmount + toNano('1'));

        const adminWithdrawSendAmount = toNano('0.05');
        const adminWithdrawResult = await adminWallet.sendAdminWithdrawal(admin.getSender(), adminWithdrawSendAmount);

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: admin.address,
            to: adminWallet.address,
            op: 0x217e5898,
            value: adminWithdrawSendAmount,
            success: true,
        });
        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: admin.address,
            success: true
        });

        printTransactionFees(adminWithdrawResult.transactions);
    });

    it ('should throw 404 if not admin send admin_withdraw', async() => {
        const adminWithdrawSendAmount = toNano('0.05');
        const adminWithdrawResult = await adminWallet.sendAdminWithdrawal(user.getSender(), adminWithdrawSendAmount);

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: user.address,
            to: adminWallet.address,
            op: 0x217e5898,
            value: adminWithdrawSendAmount,
            success: false,
            inMessageBounceable: true,
            exitCode: 404
        });
        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: user.address,
            inMessageBounced: true,
            success: true
        });

        printTransactionFees(adminWithdrawResult.transactions);
    });

    it ('should throw 401 when admin withdraw with balance <= min_balance', async() => {
        const adminWithdrawSendAmount = toNano('0.05');
        const adminWithdrawResult = await adminWallet.sendAdminWithdrawal(admin.getSender(), adminWithdrawSendAmount);

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: admin.address,
            to: adminWallet.address,
            op: 0x217e5898,
            value: adminWithdrawSendAmount,
            success: false,
            inMessageBounceable: true,
            exitCode: 401
        });
        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: admin.address,
            inMessageBounced: true,
            success: true
        });

        printTransactionFees(adminWithdrawResult.transactions);
    });
});
