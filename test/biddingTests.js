import {TestableArtWrapper} from "./TestableArtWrapper";

const bigInt = require('big-integer');

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");
const emptyBid = {address: "0x0000000000000000000000000000000000000000", amount: 0, finishTime: 0};

const STATE_NOT_FINISHED = 0;
const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;
const COMMISSION = 0.039;
const MINIMUM_BID_AMOUNT_WEI = bigInt(80000000000000000); //0.08 ether
const BIDDING_DURATION_HOURS = 48;


const GAS_PRICE = "2000000000";
// const ACCOUNT_PIXELS = [400, 350, 450, 500, 250, 446, 500, 350, 450, 400];
const ACCOUNT_PIXELS = [1, 2, 5, 2, 3, 3, 1, 1, 2, 5];
const BIDS = [bigInt("70000000000000000"), bigInt("90000000000000000"), bigInt("80000000000000000"), bigInt("100000000000000000")];

let finishTime = 0;

contract('Initial bidding suite', async (accounts) => {

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

    it('should disallow to secure not finished canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.secure(0).should.be.rejected;
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

        result.should.be.eql(emptyBid);
    });

    it('should disallow to bid with value smaller than minimal', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBid(0, {value: BIDS[0]}).should.be.rejected;
    });

    it('should be possible to place a bid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const amount = BIDS[1];
        const balance = instance.getBalance(accounts[0]);

        const response = await instance.makeBid(0, {from: accounts[0], value: amount, gasPrice: GAS_PRICE});
        const gasUsed = bigInt(GAS_PRICE).multiply(response.receipt.gasUsed);
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
        return instance.makeBid(0, {value: BIDS[2]}).should.be.rejected;
    });

    it('should return money when outbid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = BIDS[3];

        const balance0 = instance.getBalance(accounts[0]);
        const balance1 = instance.getBalance(accounts[1]);
        const oldBid = await instance.getLastBidForCanvas(0);

        const response = await instance.makeBid(0, {from: accounts[1], value: BIDS[3], gasPrice: GAS_PRICE});
        const gasUsed = bigInt(GAS_PRICE).multiply(response.receipt.gasUsed);
        const newBalance0 = instance.getBalance(accounts[0]);
        const newBalance1 = instance.getBalance(accounts[1]);

        balance0.plus(oldBid.amount).eq(newBalance0).should.be.true;
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

    it('should finish initial bidding', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.pushTimeForward(BIDDING_DURATION_HOURS);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);
    });

    it('should calculate correct commission', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const bid = await instance.getLastBidForCanvas(0);

        const desiredCommission = bid.amount * COMMISSION;
        const commission = await instance.calculateCommission(0);

        desiredCommission.should.be.eq(commission.commission);
        commission.isPaid.should.be.false;
    });

    it('should calculate correct reward', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const bid = await instance.getLastBidForCanvas(0);
        const pixelCount = await instance.PIXEL_COUNT();

        const toDistribute = (1 - COMMISSION) * bid.amount;

        for (let i = 0; i < ACCOUNT_PIXELS.length; i++) {
            const account = accounts[i];
            const pixelsSet = ACCOUNT_PIXELS[i];
            const share = pixelsSet / pixelCount;
            const desiredReward = toDistribute * share;

            const reward = await instance.calculateReward(0, account);

            pixelsSet.should.be.eq(reward.pixelCount);
            desiredReward.should.be.eq(reward.reward);
            reward.isPaid.should.be.false;
        }
    });

    it('should withdraw reward', function () {

    });

    it('should not allow to withdraw reward twice', function () {

    });

    it('should withdraw fee', function () {

    });

    it('should not allow to withdraw fee twice', function () {

    });

    it('should disallow to secure canvas when not called by owner', function () {

    });

    it('should secure canvas', function () {
        //after securing canvas, it should be time manipulation proof!
    });

    it('should disallow to bid when canvas is secured (and went back in time)', function () {

    });


});