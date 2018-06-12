const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const BigNumber = require('bignumber.js');
const assert = require("assert");

const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;

/**
 * Generates array that is filled with numbers [from,...,to]
 * @param from inclusive
 * @param to exclusive
 */
export function generateArray(from, to) {
    const array = [];
    for (let i = from; i < to; i++) {
        array.push(i)
    }

    return array;
}

/**
 * @param {BigNumber} amount
 * @param {number} pixelCount
 */
export function splitBid(amount, pixelCount) {
    const fee = amount.times(39)
        .dividedBy(1000);

    const rewardPerPixel = amount.minus(fee)
        .dividedBy(pixelCount);

    const rewards = rewardPerPixel.times(pixelCount);

    return {
        commission: amount.minus(rewards),
        paintersRewards: rewards
    }
}

/**
 * @param {BigNumber} amount
 * @param {number} pixelCount
 */
export function splitTrade(amount, pixelCount) {
    const commission = amount.times(39)
        .dividedBy(1000);

    const rewardPerPixel = amount.times(61)
        .dividedBy(1000)
        .dividedBy(pixelCount);

    const rewards = rewardPerPixel.times(pixelCount);
    const sellerProfit = amount.minus(rewards).minus(commission);

    return {
        commission: commission,
        paintersRewards: rewards,
        sellerProfit: sellerProfit
    }
}

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

    if (!balanceOfContract.eq(toPay)) {
        assert.fail(null, null, 'Balance of the contract is not equal to all possible withdrawals.\n' +
            `Balance of the contract: ${balanceOfContract}\n` +
            `All withdrawals: ${toPay}`);
    }
}

/**
 * @param {TestableArtWrapper} instance
 */
export async function checkCommissionsIntegrity(instance) {
    const canvasCount = await instance.canvasCount();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);
        if (state === STATE_OWNED) {
            const toWithdraw = await instance.calculateCommissionToWithdraw(i);
            const totalCommission = await instance.getTotalCommission(i);
            const withdrawnCommission = await instance.getCommissionWithdrawn(i);

            const sum = toWithdraw.plus(withdrawnCommission);
            if (!sum.eq(totalCommission)) {
                assert.fail(null, null, `Failed checking commission integrity for canvas ${i}.\n` +
                    `\tCommission to withdraw: ${toWithdraw}\n` +
                    `\tWithdrawn commission  : ${withdrawnCommission}\n` +
                    `\tTotal commission      : ${totalCommission}\n`);
            }
        }
    }
}

/**
 * @param {TestableArtWrapper} instance
 * @param {Array<string>} accounts
 */
export async function checkRewardsIntegrity(instance, accounts) {
    const canvasCount = await instance.canvasCount();
    const pixelCount = await instance.PIXEL_COUNT();

    for (let i = 0; i < canvasCount; i++) {
        const state = await instance.getCanvasState(i);
        if (state !== STATE_OWNED) {
            continue;
        }

        let paid = new BigNumber(0);
        let toWithdraw = new BigNumber(0);
        const totalRewards = await instance.getTotalRewards(i);

        for (let j = 0; j < accounts.length; j++) {
            const rewardPaid = await instance.getRewardsWithdrawn(i, accounts[j]);
            const toReward = await instance.calculateRewardToWithdraw(i, accounts[j]);
            const pixelsOwned = await instance.getPaintedPixelsCountByAddress(accounts[j], i);

            paid = paid.plus(rewardPaid);
            toWithdraw = toWithdraw.plus(toReward);

            const expectedReward = totalRewards.dividedBy(pixelCount).times(pixelsOwned);
            if (!rewardPaid.plus(toReward).eq(expectedReward)) {
                assert.fail(null, null, `Failed checking rewards integrity for canvas ${i}, account[${j}]: ${accounts[j]}\n` +
                    `\tRewards paid     : ${rewardPaid}\n` +
                    `\tTo reward        : ${toReward}\n` +
                    `\tOwned pixels:    : ${pixelsOwned}\n` +
                    `\tTotal rewards:   : ${totalRewards}\n` +
                    `\tExpected reward  : ${expectedReward}\n`);
            }
        }

        if (!paid.plus(toWithdraw).eq(totalRewards)) {
            assert.fail(null, null, `Failed checking rewards integrity for canvas ${i}.\n` +
                `\tTotal paid    : ${paid}\n` +
                `\tTotal to pay  : ${toWithdraw}\n` +
                `\tTotal rewards : ${totalRewards}\n`);
        }
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
                const reward = await instance.calculateRewardToWithdraw(j, account);
                rewards = rewards.plus(reward);
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
            const commission = await instance.calculateCommissionToWithdraw(i);
            commissions = commissions.plus(commission);
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