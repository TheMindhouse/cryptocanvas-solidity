import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const bigInt = require('big-integer');

const TestableArt = artifacts.require("TestableArt");

const STATE_NOT_FINISHED = 0;
const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;

const eth = bigInt("100000000000000000");

const gasCosts = [];
let pixelCount = 0;
let owner = `0x0`;


/**
 * Calculates gas cost of non-view, external/public functions. Nicely prints out the result.
 * It takes into account most popular cases.
 */
contract('Contract gas calculator', async (accounts) => {

    before(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        pixelCount = await instance.PIXEL_COUNT();
        pixelCount.should.be.gt(0);
    });

    after(() => {
        console.log(`\nGas costs for canvas of ${pixelCount} pixels\n`);

        //find longest description and set proper spacing to make
        //sure results is beautifully readable
        const longestText = gasCosts.reduce((a, b) => a[0].length > b[0].length ? a : b);
        const longestCost = gasCosts.reduce((a, b) => a[1].toString().length > b[1].toString().length ? a : b);

        gasCosts.forEach(value => {
            let spaces = longestText[0].length + longestCost[1].toString().length + 4;
            spaces -= value[0].length;
            spaces -= value[1].toString().length;

            const toLog = value[0] + ':' + Array(spaces).join(' ') + value[1];
            console.log(toLog)
        })
    });

    it("calculate creation cost", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const transaction = await instance.createCanvas();
        const cost = transaction.receipt.gasUsed;

        gasCosts.push(["createCanvas()", cost]);
    });

    it('calculate drawing cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.setPixel(0, 0, 10);
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [new one]', cost]);

        transaction = await instance.setPixel(0, 0, 10);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [update]', cost]);

        for (let i = 0; i < pixelCount - 1; i++) {
            await instance.setPixel(0, i, 10);
        }

        transaction = await instance.setPixel(0, pixelCount - 1, 10);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [last one]', cost]);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);
    });

    it('calculate making bid cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.makeBid(0, {from: accounts[0], value: eth});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBid() [first one]', cost]);

        transaction = await instance.makeBid(0, {from: accounts[1], value: eth.multiply(2)});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBid() [outbidding someone]', cost]);

        owner = accounts[1];
    });

    /**
     * Account 1 wins initial bidding
     */
    it('calculate securing cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.pushTimeForward(48);
        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);
    });

    it('calculate withdraw reward cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.addRewardToPendingWithdrawals(0, {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['addRewardToPendingWithdrawals() [1 address painted all pixels]', cost]);
    });

    it('calculate withdraw commission cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.addCommissionToPendingWithdrawals(0, {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['addCommissionToPendingWithdrawals()', cost]);
    });

    it('calculate changing minimum bid amount cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.setMinimumBidAmount(eth.toString(), {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setMinimumBidAmount()', cost]);
    });

    it('calculate offering for sale cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.offerCanvasForSaleToAddress(0, 10, accounts[5], {from: owner});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['offerCanvasForSaleToAddress()', cost]);

        transaction = await instance.offerCanvasForSale(0, 10, {from: owner});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['offerCanvasForSale()', cost]);

        transaction = await instance.cancelSellOffer(0, {from: owner});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['cancelSellOffer()', cost]);
    });

    it('calculate accepting sell offer cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        console.log(await instance.getCurrentSellOffer(0));
        console.log(await instance.getCanvasInfo(0));

        let transaction = await instance.acceptSellOffer(0, {from: accounts[0], value: 100});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptSellOffer()', cost]);
        owner = accounts[0];

        await instance.offerCanvasForSale(0, 10, {from: owner});
        await instance.makeBuyOffer(0, {from: accounts[1], value: 10});

        transaction = await instance.acceptSellOffer(0, {from: accounts[1], value: 100});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptSellOffer() [when having buy offer posted]', cost]);
        owner = accounts[1];
    });

    it('calculate making buy offer costs', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.makeBuyOffer(0, {from: accounts[0], value: 10});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBuyOffer()', cost]);

        transaction = await instance.makeBuyOffer(0, {from: accounts[5], value: 20});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBuyOffer() [outbidding someone]', cost]);

        transaction = await instance.cancelBuyOffer(0, {from: accounts[5]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['cancelBuyOffer()', cost]);
    });

    /**
     * Account 5 buys canvas
     */
    it('calculate accepting buy offer cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyer = accounts[5];
        await instance.makeBuyOffer(0, {from: buyer, value: eth});

        let transaction = await instance.acceptBuyOffer(0, 0, {from: owner});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptBuyOffer()', cost]);

        owner = buyer;
    });

    it('calculate withdraw cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.withdraw({from: accounts[1]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['withdraw()', cost]);
    });


});