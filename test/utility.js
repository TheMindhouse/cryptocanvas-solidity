const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const bigInt = require('big-integer');
const STATE_OWNED = 2;

/**
 * Checks balance consistency.
 * <br>
 * Sum of all pending withdrawals, all rewards for canvas,
 * commission and fees has to be equal to current balance.
 *
 * @param {TestableArtWrapper} instance
 * @param {Array<String>} accounts
 */
export async function checkBalanceConsistency(instance, accounts) {
    const balanceOfContract = instance.getBalanceOfContract();
    const pendingWithdrawals = await calculatePendingWithdrawals(instance, accounts);
    const rewards = await calculateRewards(instance, accounts);
    const commissions = await calculateCommissions(instance);

    const toPay = pendingWithdrawals.plus(rewards).plus(commissions);

    balanceOfContract.eq(toPay).should.be.true;
}

async function calculatePendingWithdrawals(instance, accounts) {
    let pending = bigInt();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        pending = pending.plus(await instance.getPendingWithdrawal(account));
    }

    return pending;
}

async function calculateRewards(instance, accounts) {
    let rewards = bigInt();
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        for (let j = 0; j < canvasCount; j++) {
            const state = await instance.getCanvasState(j);

            if (state === STATE_OWNED) {
                const reward = await instance.calculateReward(j, account);
                if (!reward.isPaid) {
                    rewards = rewards.add(reward.reward);
                }
            }
        }
    }

    return rewards;
}

async function calculateCommissions(instance) {
    let commissions = bigInt();
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);

        if (state === STATE_OWNED) {
            const commission = await instance.calculateCommission(i);
            if (!commission.isPaid) {
                commissions = commissions.add(commission.commission);
            }
        }
    }

    return commissions;
}