import {TestableArtWrapper} from "./TestableArtWrapper";
import {checkBalanceConsistency, checkCommissionsIntegrity, checkRewardsIntegrity, splitMoney} from "./utility";

const BigNumber = require('bignumber.js');

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");

const STATE_NOT_FINISHED = 0;
const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;
const COMMISSION = 0.039;
const MINIMUM_BID_AMOUNT_WEI = new BigNumber(80000000000000000); //0.08 ether
const BIDDING_DURATION_HOURS = 48;

const MAX_ALLOWED_GAS_PER_PIXEL = 100000;

let pixelCount = 0;

const GAS_PRICE = new BigNumber("2000000000");
const ACCOUNT_PIXELS = [200, 275, 225, 250, 175, 270, 250, 284, 375];
// const ACCOUNT_PIXELS = [1, 2, 5, 2, 3, 4, 1, 2, 5];

const BIDS = [new BigNumber("70000000000000000"), new BigNumber("110000000000000000"), new BigNumber("100000000000000000"), new BigNumber("130000000000000000")];

let finishTime = 0;

contract('Initial bidding suite', async (accounts) => {

    before(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        pixelCount = await instance.PIXEL_COUNT();
    });

    afterEach(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await checkBalanceConsistency(instance, accounts);
        await checkCommissionsIntegrity(instance);
        await checkRewardsIntegrity(instance, accounts);
    });

    it("should fail to return state of not existing canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.getCanvasState(0).should.be.rejected;
    });

    it('should have 0 state for not finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_NOT_FINISHED);

    });

    it('should disallow to bid when canvas is not finished', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBid(0, {from: accounts[0], amount: MINIMUM_BID_AMOUNT_WEI}).should.be.rejected;
    });

    it('should not allow to withdraw reward on not finished canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.addRewardToPendingWithdrawals(0).should.be.rejected;
    });

    it('should not allow to withdraw commission on not finished canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const owner = accounts[0];
        return instance.addCommissionToPendingWithdrawals(0, {from: owner}).should.be.rejected;
    });

    it(`should have price for setting pixel lower than ${MAX_ALLOWED_GAS_PER_PIXEL} gas`, async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        let result = await instance.setPixel(1, 0, 10, {from: accounts[0]});
        let gas = parseInt(result.receipt.gasUsed);

        gas.should.be.lessThan(MAX_ALLOWED_GAS_PER_PIXEL);

        result = await instance.setPixel(1, 1, 20, {from: accounts[1]});
        gas = parseInt(result.receipt.gasUsed);

        gas.should.be.lessThan(MAX_ALLOWED_GAS_PER_PIXEL);
    });

    it('should have 1 state for finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const pixelIndices = [0];
        ACCOUNT_PIXELS.reduce(function (a, b, i) {
            return pixelIndices[i + 1] = a + b;
        }, 0);

        for (let i = 1; i < pixelIndices.length; i++) {
            await instance.fillCanvas(0, pixelIndices[i - 1], pixelIndices[i], i, {from: accounts[i - 1]});
        }

        const state = await instance.getCanvasState(0);
        const bidding = await instance.getCanvasByState(1);

        state.should.be.eq(STATE_INITIAL_BIDDING);
        bidding.should.be.equalTo([0]);
    });

    it('should disallow to set pixels on finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 10, 10).should.be.rejected;
    });

    it('should have no bids when initial bidding starts', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const result = await instance.getLastBidForCanvas(0);

        result.amount.eq(0).should.be.true;
    });

    it('should disallow to bid with value smaller than minimal', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBid(0, {value: BIDS[0]}).should.be.rejected;
    });

    it('should be possible to place a bid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const amount = BIDS[1];
        const balance = instance.getBalance(accounts[0]);

        const response = await instance.makeBid(0, {
            from: accounts[0],
            value: amount.toNumber(),
            gasPrice: GAS_PRICE.toNumber()
        });
        const gasUsed = GAS_PRICE.multipliedBy(response.receipt.gasUsed);
        const newBalance = instance.getBalance(accounts[0]);

        balance.minus(amount.plus(gasUsed)).eq(newBalance).should.be.true;

        const bid = await instance.getLastBidForCanvas(0);
        bid.address.should.be.eq(accounts[0]);
        amount.eq(bid.amount).should.be.true;
        finishTime = bid.finishTime;

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);

        const balanceOf = await instance.balanceOf(accounts[0]);
        balanceOf.should.be.eq(1);
    });

    it('should disallow do bid with value smaller than previous bid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBid(0, {value: BIDS[2].toNumber()}).should.be.rejected;
    });

    it('should return money when outbid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = BIDS[3];

        const pending0 = await instance.getPendingWithdrawal(accounts[0]);
        const balance1 = instance.getBalance(accounts[1]);
        const oldBid = await instance.getLastBidForCanvas(0);

        const response = await instance.makeBid(0, {
            from: accounts[1],
            value: BIDS[3].toNumber(),
            gasPrice: GAS_PRICE.toNumber()
        });
        const gasUsed = GAS_PRICE.multipliedBy(response.receipt.gasUsed);
        const newPending0 = await instance.getPendingWithdrawal(accounts[0]);
        const newBalance1 = instance.getBalance(accounts[1]);

        pending0.plus(oldBid.amount).eq(newPending0).should.be.true;
        balance1.minus(amount.plus(gasUsed)).eq(newBalance1).should.be.true;

        const bid = await instance.getLastBidForCanvas(0);
        bid.address.should.be.eq(accounts[1]);
        amount.eq(bid.amount).should.be.true;
        bid.finishTime.should.be.eq(finishTime);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);

        const balanceOf0 = await instance.balanceOf(accounts[0]);
        const balanceOf1 = await instance.balanceOf(accounts[1]);
        balanceOf0.should.be.eq(0);
        balanceOf1.should.be.eq(1);
    });

    it('should not return canvas by owner if in initial bidding', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const canvases = await instance.getCanvasByOwner(accounts[1]);

        canvases.length.should.be.eq(0);
    });

    it('should finish initial bidding', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.pushTimeForward(BIDDING_DURATION_HOURS);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);
    });

    it('should return canvases by owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const canvases = await instance.getCanvasByOwner(accounts[1]);

        canvases.length.should.be.eq(1);
    });


    it('should calculate correct commission', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const bid = await instance.getLastBidForCanvas(0);

        const split = splitMoney(bid.amount, COMMISSION, pixelCount);
        const commission = (await instance.calculateCommission(0));

        commission.commission.eq(split.cut).should.be.true;
        commission.isPaid.should.be.false;
    });

    it('should calculate correct reward', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const bid = await instance.getLastBidForCanvas(0);
        const split = splitMoney(bid.amount, COMMISSION, pixelCount);

        for (let i = 0; i < ACCOUNT_PIXELS.length; i++) {
            const account = accounts[i];
            const pixelsSet = ACCOUNT_PIXELS[i];
            const desiredReward = split.pricePerPixel.multipliedBy(pixelsSet);

            const reward = await instance.calculateReward(0, account);

            pixelsSet.should.be.eq(reward.pixelCount);
            desiredReward.eq(reward.reward).should.be.true;
            reward.isPaid.should.be.false;
        }
    });


    it('should not allow to withdraw reward when didn\'t paint any pixels', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        let account = accounts[9];
        const reward = await instance.calculateReward(0, account);

        reward.reward.eq(0).should.be.true;
        return instance.addRewardToPendingWithdrawals(0, {from: account}).should.be.rejected;
    });

    it('should withdraw reward', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        for (let i = 0; i < ACCOUNT_PIXELS.length; i++) {
            const account = accounts[i];
            let reward = await instance.calculateReward(0, account);

            const pending = await instance.getPendingWithdrawal(account);

            await instance.addRewardToPendingWithdrawals(0, {
                from: account,
                gasPrice: GAS_PRICE.toNumber()
            });
            const newPending = await instance.getPendingWithdrawal(account);

            pending.plus(reward.reward).eq(newPending).should.be.true;

            reward = await instance.calculateReward(0, account);
            reward.isPaid.should.be.true;
        }
    });

    it('should not allow to withdraw reward twice', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.addRewardToPendingWithdrawals(0, {from: accounts[0]}).should.be.rejected;

    });

    it('should not allow to withdraw commission when not called by the owner of the contract', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.addCommissionToPendingWithdrawals(0, {from: accounts[1]}).should.be.rejected;
    });

    it('should withdraw commission', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let owner = accounts[0];
        const pending = await instance.getPendingWithdrawal(owner);
        let commission = await instance.calculateCommission(0);

        await instance.addCommissionToPendingWithdrawals(0, {
            from: owner
        });

        const newPending = await instance.getPendingWithdrawal(owner);

        pending.plus(commission.commission).eq(newPending).should.be.true;

        commission = await instance.calculateCommission(0);
        commission.isPaid.should.be.true;
    });

    it('should not allow to withdraw fee twice', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        let owner = accounts[0];
        return instance.addCommissionToPendingWithdrawals(0, {from: owner}).should.be.rejected;
    });

    it('should disallow to make bid when time is hacked (go back in time)', async () => {
        //canvas is being 'secured' first time somebody interacts with it
        //after initial bidding is finished.
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const fakeBid = BIDS[3].multipliedBy(2);
        const hacker = accounts[5];

        // emulate messing with 'now' -> going back in time
        await instance.mockTime(0);

        return instance.makeBid(0, {from: hacker, value: fakeBid.toNumber()}).should.be.rejected;
    });

    it('should not allow to change minimum bid amount if not called by the owner of the contract', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const notOwner = accounts[3];

        return instance.setMinimumBidAmount(1, {from: notOwner}).should.be.rejected;
    });

    it('should change minimum bid amount', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const owner = accounts[0];

        await instance.setMinimumBidAmount(10, {from: owner});
        const minBidAmount = await instance.minimumBidAmount();

        minBidAmount.should.be.eq(10);
    });

});