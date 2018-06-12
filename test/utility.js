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
 * Splits money. Calculates reward per pixel, total reward and a commission.
 * Note that total commission can be a bit higher that commission * amount,
 * because of integer division remainder when calculating pixel price.
 *
 * @param {BigNumber} amount - amount to split
 * @param {Number} commission - float number, greater than 0.0, smaller than 1.0
 * @param {Number} pixelCount - pixel count. Integer number
 *
 * @returns {{cut: BigNumber, pricePerPixel: BigNumber, rewards: BigNumber}}
 */
export function splitMoney(amount, commission, pixelCount) {
    pixelCount = Math.floor(pixelCount);
    amount = new BigNumber(amount);

    const rewardPercent = new BigNumber(1 - commission);
    const pricePerPixel = amount.multipliedBy(rewardPercent)
        .dividedBy(pixelCount)
        .integerValue(BigNumber.BigNumber.ROUND_FLOOR);

    const rewardsSum = pricePerPixel.multipliedBy(pixelCount);
    const cut = amount.minus(rewardsSum);

    return {
        cut: cut,
        pricePerPixel: pricePerPixel,
        rewards: rewardsSum
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
                assert.fail(null, null, `Failed checking commission integrity for canvas ${i}.` +
                    `\tCommission to withdraw: ${toWithdraw}` +
                    `\tWithdrawn commission  : ${withdrawnCommission}` +
                    `\tTotal commission      : ${totalCommission}`);
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

            const expectedReward = totalRewards.dividedBy(pixelsOwned);
            if (!rewardPaid.plus(toReward).eq(expectedReward)) {
                assert.fail(null, null, `Failed checking rewards integrity for canvas ${i}, account: ${accounts[j]}` +
                    `\tRewards paid           : ${rewardPaid}` +
                    `\tTo reward              : ${toReward}` +
                    `\tExpected total reward  : ${expectedReward}`);
            }
        }

        if (!paid.plus(toWithdraw).eq(totalRewards)) {
            assert.fail(null, null, `Failed checking rewards integrity for canvas ${i}.` +
                `\tTotal paid    : ${paid}` +
                `\tTotal to pay  : ${toWithdraw}` +
                `\tTotal rewards : ${totalRewards}`);
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