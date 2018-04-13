const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const BigNumber = require('bignumber.js');
const assert = require("assert");

const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;

/**
 * Checks balance consistency.
 * <br>
 * Sum of all pending withdrawals, all rewards for canvas,
 * commission, fees and bids and buy offers has to be equal to current balance.
 *
 * @param {TestableArtWrapper} instance
 * @param {Array<String>} accounts
 */
export async function checkBalanceConsistency(instance, accounts) {
    const balanceOfContract = instance.getBalanceOfContract();
    const pendingWithdrawals = await calculatePendingWithdrawals(instance, accounts);
    const rewards = await calculateRewards(instance, accounts);
    const commissions = await calculateCommissions(instance);
    const buyOffers = await calculateBuyOffers(instance);
    const bids = await calculateInitialBids(instance);

    const toPay = pendingWithdrawals.plus(rewards).plus(commissions).plus(buyOffers).plus(bids);

    console.log(`Balance: ${balanceOfContract.toString()}, toPay: ${toPay.toString()}`);

    if (!balanceOfContract.eq(toPay)) {
        assert.fail(null, null, 'Balance of the contract is not equal to all possible withdrawals.\n' +
            `Balance of the contract: ${balanceOfContract}\n` +
            `All withdrawals: ${toPay}`);
    }

}

async function calculatePendingWithdrawals(instance, accounts) {
    let pending = new BigNumber(0);

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        let withdrawal = await instance.getPendingWithdrawal(account);
        pending = pending.plus(withdrawal);
    }

    return pending;
}

async function calculateRewards(instance, accounts) {
    let rewards = new BigNumber(0);
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        for (let j = 0; j < canvasCount; j++) {
            const state = await instance.getCanvasState(j);

            if (state === STATE_OWNED) {
                const reward = await instance.calculateReward(j, account);
                if (!reward.isPaid) {
                    rewards = rewards.plus(reward.reward);
                }
            }
        }
    }

    return rewards;
}

async function calculateCommissions(instance) {
    let commissions = new BigNumber(0);
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);

        if (state === STATE_OWNED) {
            const commission = await instance.calculateCommission(i);
            if (!commission.isPaid) {
                commissions = commissions.plus(commission.commission);
            }
        }
    }

    return commissions;
}

async function calculateBuyOffers(instance) {
    let buyOffers = new BigNumber(0);
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);

        if (state === STATE_OWNED) {
            const offer = await instance.getCurrentBuyOffer(i);
            if (offer.hasOffer) {
                buyOffers = buyOffers.plus(offer.amount);
            }
        }
    }

    return buyOffers;
}

async function calculateInitialBids(instance) {
    let bids = new BigNumber(0);
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);

        if (state === STATE_INITIAL_BIDDING) {
            const bid = await instance.getLastBidForCanvas(i);
            bids = bids.plus(bid.amount);
        }
    }

    return bids;
}