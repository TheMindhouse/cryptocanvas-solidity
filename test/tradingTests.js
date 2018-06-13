import {TestableArtWrapper} from "./TestableArtWrapper";
import {
    checkBalanceConsistency,
    checkCommissionsIntegrity,
    checkRewardsIntegrity,
    splitBid,
    splitTrade, verifyFees
} from "./utility";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const BigNumber = require('bignumber.js');

const TestableArt = artifacts.require("TestableArt");

const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;
const GAS_PRICE = new BigNumber("2000000000");
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const eth = new BigNumber("100000000000000000");

const winningBid = eth;
const trades = [];

const ACCOUNT_PIXELS = [200, 275, 225, 250, 175, 270, 250, 284, 375];
// const ACCOUNT_PIXELS = [1, 2, 5, 2, 3, 4, 1, 2, 5];

/**
 * All tests that involve trading will calculate expected fees. It has to verified
 * at the end of the test suite.
 * @type {number}
 */
let expectedFees = new BigNumber(0);
let owner = '0x0';
let pixelCount = 0;

contract('Canvas trading suite', async (accounts) => {

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

    /**
     * Creates canvas.
     */
    it("should create canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();
    });

    it("should not allow to buy not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0).should.be.rejected;
    });

    it("should not allow to offer for sale not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 10).should.be.rejected;
    });

    it("should not allow to offer for sale (to address) not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, accounts[2]).should.be.rejected;
    });

    it("should not allow to cancel sale not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelSellOffer(0).should.be.rejected;
    });

    it("should not allow to enter buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBuyOffer(0, {value: 100000}).should.be.rejected;
    });

    it("should not allow to cancel buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0).should.be.rejected;
    });

    it("should not allow to accept buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0).should.be.rejected;
    });

    it("should return empty buy offer when canvas is not finished", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;
    });

    it("should return empty sell offer when canvas is not finished", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const sellOffer = await instance.getCurrentSellOffer(0);

        sellOffer.isForSale.should.be.false;
    });

    it("should return empty canvases with sell offers", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const withSellOffer = await instance.getCanvasesWithSellOffer(true);

        withSellOffer.should.be.empty;
    });

    /**
     * Fills canvas with pixels. Starts INITIAL BIDDING.
     */
    it('should fill the canvas', async () => {
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

    it("should not allow to buy when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0).should.be.rejected;
    });

    it("should not allow to offer for sale when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 10).should.be.rejected;
    });

    it("should not allow to offer for sale (to address) when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, accounts[2]).should.be.rejected;
    });

    it("should not allow to cancel sale when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelSellOffer(0).should.be.rejected;
    });

    it("should not allow to enter buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBuyOffer(0, {value: 100000}).should.be.rejected;
    });

    it("should not allow to cancel buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0).should.be.rejected;
    });

    it("should not allow to accept buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0).should.be.rejected;
    });

    it("should return empty buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;
    });

    it("should return empty sell offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const sellOffer = await instance.getCurrentSellOffer(0);

        sellOffer.isForSale.should.be.false;
    });

    /**
     * Account 1 wins initial bidding.
     */
    it("should change its state to OWNED when somebody will will initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        owner = accounts[1];
        await instance.makeBid(0, {from: owner, value: winningBid.toNumber()});
        await instance.pushTimeForward(48);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);

        const balance = await instance.balanceOf(owner);
        balance.should.be.eq(1);

        const split = splitBid(eth, pixelCount);
        expectedFees = expectedFees.plus(split.commission);

        await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, eth, trades);
    });

    it('should not allow to buy canvas if it\'s not offered for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0, {from: accounts[0], value: 10000000}).should.be.rejected;
    });

    it('should not allow to offer canvas for sale if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 1000, {from: accounts[0]}).should.be.rejected;
    });

    it('should not allow to offer canvas for sale (for address) if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 1000, accounts[5], {from: accounts[0]}).should.be.rejected;
    });

    /**
     * Owner (account 1) posts sell offer.
     */
    it('should offer canvas for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.seller.should.be.eq(owner);
        sellOffer.minPrice.should.be.eq(10);
        sellOffer.onlySellTo.should.be.eq(ZERO_ADDRESS);
    });

    it("should return 1 canvas with sell offers", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const withSellOffer = await instance.getCanvasesWithSellOffer(true);

        withSellOffer.should.be.equalTo([0]);
    });

    it('should not allow to cancel sell offer if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelSellOffer(0, {from: accounts[8]}).should.be.rejected;
    });

    it('should not allow to buy canvas if sell offer has been cancelled', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.cancelSellOffer(0, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.false;

        return instance.acceptSellOffer(0, {from: accounts[5], value: 20}).should.be.rejected;
    });

    /**
     * Owner (account 1) posts sell offer.
     */
    it('should offer canvas for sale 2', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.seller.should.be.eq(owner);
        sellOffer.minPrice.should.be.eq(10);
        sellOffer.onlySellTo.should.be.eq(ZERO_ADDRESS);
    });

    it('should not allow to buy a canvas for amount smaller than minimum', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0, {from: accounts[0], value: 8}).should.be.rejected;
    });

    it('should not allow address to buy its canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0, {from: owner, value: 50}).should.be.rejected;
    });

    /**
     * Account 2 buys canvas.
     */
    it('should buy a canvas offered for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multipliedBy(2); //2 eth
        const split = splitTrade(amount, pixelCount);
        const buyer = accounts[2];

        const buyerBalance = await instance.getBalance(buyer);
        const sellerPending = await instance.getPendingWithdrawal(owner);
        const rewards = await instance.getTotalRewards(0);

        const result = await instance.acceptSellOffer(0, {
            from: buyer,
            value: amount.toNumber(),
            gasPrice: GAS_PRICE.toNumber()
        });

        const gas = GAS_PRICE.multipliedBy(result.receipt.gasUsed);
        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerBalance = await instance.getBalance(buyer);
        const newSellerPending = await instance.getPendingWithdrawal(owner);
        const newRewards = await instance.getTotalRewards(0);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
        sellerPending.plus(split.sellerProfit).eq(newSellerPending).should.be.true;
        rewards.plus(split.paintersRewards).eq(newRewards).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        owner = buyer;
        expectedFees = expectedFees.plus(split.commission);

        trades.push(amount);
        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    it('should not allow to offer a canvas for sale for an owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, owner, {from: owner}).should.be.rejected;
    });

    /**
     * Account 2 offers canvas for sale only for account 5.
     */
    it('should offer canvas for sale for specified address', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        let sellTo = accounts[5];
        await instance.offerCanvasForSaleToAddress(0, 20, sellTo, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.minPrice.should.be.eq(20);
        sellOffer.seller.should.be.eq(owner);
        sellOffer.onlySellTo.should.be.eq(sellTo);
    });

    it("should return 1 canvas with sell offers [private offer]", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const withSellOffer = await instance.getCanvasesWithSellOffer(true);

        withSellOffer.should.be.equalTo([0]);
    });

    it("should return 0 canvas with sell offers [private offer]", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const withSellOffer = await instance.getCanvasesWithSellOffer(false);

        withSellOffer.should.be.empty;
    });

    it('should not allow to buy canvas by the address different than specified', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptSellOffer(0, {from: accounts[8], value: 100}).should.be.rejected;
    });

    /**
     * Account 5 buys canvas.
     */
    it('should buy canvas when specific address is specified', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multipliedBy(1); //1 eth
        const split = splitTrade(amount, pixelCount);
        const buyer = accounts[5];

        const buyerBalance = await instance.getBalance(buyer);
        const sellerPending = await instance.getPendingWithdrawal(owner);

        const result = await instance.acceptSellOffer(0, {
            from: buyer,
            value: amount.toNumber(),
            gasPrice: GAS_PRICE.toNumber()
        });

        const gas = GAS_PRICE.multipliedBy(result.receipt.gasUsed);
        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerBalance = await instance.getBalance(buyer);
        const newSellerPending = await instance.getPendingWithdrawal(owner);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
        sellerPending.plus(split.sellerProfit).eq(newSellerPending).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        owner = buyer;
        expectedFees = expectedFees.plus(split.commission);

        trades.push(amount);
        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    /**
     * Account 7 buys canvas.
     */
    it('should return buy offer when buying a canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multipliedBy(3);
        const buyOffer = eth.multipliedBy(2);
        const split = splitTrade(amount, pixelCount);
        const buyer = accounts[7];

        //Enter buy offer and sell offer.
        await instance.makeBuyOffer(0, {from: buyer, value: buyOffer.toNumber()});
        await instance.offerCanvasForSale(0, 10, {from: owner});

        //Balance after posting offers
        const buyerPending = await instance.getPendingWithdrawal(buyer);
        const sellerPending = await instance.getPendingWithdrawal(owner);

        await instance.acceptSellOffer(0, {from: buyer, value: amount.toNumber()});

        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerPending = await instance.getPendingWithdrawal(buyer);
        const newSellerPending = await instance.getPendingWithdrawal(owner);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        //Buyer should have buy offer refunded
        buyerPending.plus(buyOffer).eq(newBuyerPending).should.be.true;
        sellerPending.plus(split.sellerProfit).eq(newSellerPending).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        //Buy offer should be cancelled
        (await instance.getCurrentBuyOffer(0)).hasOffer.should.be.false;

        owner = buyer;
        expectedFees = expectedFees.plus(split.commission);

        trades.push(amount);
        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    it('should not allow to make a buy offer when called by owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBuyOffer(0, {from: owner, value: 100}).should.be.rejected;
    });

    /**
     * Account 2 makes buy offer.
     */
    it('should make a buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const buyer = accounts[2];
        const amount = eth;
        const buyerBalance = await instance.getBalance(buyer);

        const result = await instance.makeBuyOffer(0, {
            from: buyer,
            value: eth.toNumber(),
            gasPrice: GAS_PRICE.toNumber()
        });
        const gas = GAS_PRICE.multipliedBy(result.receipt.gasUsed);

        const newBuyerBalance = await instance.getBalance(buyer);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.true;
        buyOffer.buyer.should.be.eq(buyer);
        amount.eq(buyOffer.amount).should.be.true;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
    });

    it('should not allow to cancel buy offer if not called by its owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0, {from: accounts[1]}).should.be.rejected;
    });

    /**
     * Account 2 cancels buy offer.
     */
    it('should cancel a buy offer (and refunds an offer)', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const buyer = accounts[2];
        const amount = eth;
        const buyerPending = await instance.getPendingWithdrawal(buyer);

        await instance.cancelBuyOffer(0, {from: buyer});
        const newBuyerPending = await instance.getPendingWithdrawal(buyer);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;

        buyerPending.plus(amount).eq(newBuyerPending).should.be.true;
    });

    /**
     * Account 9 posts buy offer. Account 2 has been outbid.
     */
    it('should refund buy offer when outbid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyer1 = accounts[2];
        const buyer2 = accounts[9];
        const amount1 = eth;
        const amount2 = eth.multipliedBy(2);

        await instance.makeBuyOffer(0, {from: buyer1, value: amount1.toNumber()});
        const buyer1Pending = await instance.getPendingWithdrawal(buyer1);

        await instance.makeBuyOffer(0, {from: buyer2, value: amount2.toNumber()});
        const newBuyer1Pending = await instance.getPendingWithdrawal(buyer1);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.true;
        buyOffer.buyer.should.be.eq(buyer2);
        amount2.eq(buyOffer.amount).should.be.true;

        buyer1Pending.plus(amount1).eq(newBuyer1Pending).should.be.true;
    });

    it('should not allow to make buy offer when din\'t send bigger value', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.makeBuyOffer(0, {from: accounts[2], value: eth.multipliedBy(2)}).should.be.rejected;
    });

    it('should not allow to accept buy offer if not called by the owner of the canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0, {from: accounts[9]}).should.be.rejected;

    });

    it('should not allow to accept buy offer if minimum price is higher that buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, eth.multipliedBy(10), {from: owner}).should.be.rejected;
    });

    it('should withdraw rewards', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const toWithdraw = (await instance.calculateRewardToWithdraw(0, account)).reward;
            const pending = await instance.getPendingWithdrawal(account);

            if (toWithdraw.eq(0)) {
                continue;
            }

            await instance.addRewardToPendingWithdrawals(0, {from: account});

            const newPending = await instance.getPendingWithdrawal(account);
            const newToWithdraw = (await instance.calculateRewardToWithdraw(0, account)).reward;
            const withdrawn = (await instance.getRewardsWithdrawn(0, account));

            withdrawn.eq(toWithdraw).should.be.true;
            newToWithdraw.eq(0).should.be.true;
            pending.plus(toWithdraw).eq(newPending).should.be.true;
        }

        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    /**
     * Account 9 buys canvas.
     */
    it('should accept buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        //let's do sell offer, to make sure it will be cancelled
        await instance.offerCanvasForSale(0, 10, {from: owner});
        const buyOffer = await instance.getCurrentBuyOffer(0);
        const ownerPending = await instance.getPendingWithdrawal(owner);

        const seller = owner;
        const split = splitTrade(new BigNumber(buyOffer.amount), pixelCount);

        await instance.acceptBuyOffer(0, eth.multipliedBy(2).toNumber(), {from: seller});
        const newOwnerPending = await instance.getPendingWithdrawal(seller);

        ownerPending.plus(split.sellerProfit).eq(newOwnerPending).should.be.true;

        //check ownership and balanceOf
        const info = await instance.getCanvasInfo(0);
        const balanceSeller = await instance.balanceOf(seller);
        const balanceBuyer = await instance.balanceOf(buyOffer.buyer);

        info.owner.should.be.eq(buyOffer.buyer);
        balanceSeller.should.be.eq(0);
        balanceBuyer.should.be.eq(1);

        owner = buyOffer.buyer;
        expectedFees = expectedFees.plus(split.commission);

        trades.push(new BigNumber(buyOffer.amount));
        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    it('should update rewards', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const lastTrade = trades[trades.length - 1];
        const split = splitTrade(lastTrade, pixelCount);

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            let pixels = ACCOUNT_PIXELS[i];
            if (pixels === undefined) {
                pixels = 0;
            }
            const expected = split.paintersRewards.dividedToIntegerBy(pixelCount).times(pixels);
            const toWithdraw = (await instance.calculateRewardToWithdraw(0, account)).reward;

            toWithdraw.eq(expected).should.be.true;
        }
    });

    it('should not have any buy nor sell offers after accepting buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);
        const sellOffer = await instance.getCurrentSellOffer(0);

        buyOffer.hasOffer.should.be.false;
        sellOffer.isForSale.should.be.false;
    });

    it('should calculate commission correctly', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const commission = await instance.getTotalCommission(0);
        expectedFees.eq(commission).should.be.true;
    });

    it('should withdraw commission', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const owner = accounts[0];

        const pending = await instance.getPendingWithdrawal(owner);
        const toWithdraw = await instance.calculateCommissionToWithdraw(0);
        await instance.addCommissionToPendingWithdrawals(0, {from: owner});

        const newPending = await instance.getPendingWithdrawal(owner);
        const withdrawn = await instance.getCommissionWithdrawn(0);
        const newToWithdraw = await instance.calculateCommissionToWithdraw(0);

        pending.plus(toWithdraw).eq(newPending).should.be.true;
        withdrawn.eq(toWithdraw).should.be.true;
        newToWithdraw.eq(0).should.be.true;

        const summary = await verifyFees(instance, accounts, 0, ACCOUNT_PIXELS, winningBid, trades);
    });

    //WITHDRAWABLE

    it('should withdraw pending withdrawals', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const pending = await instance.getPendingWithdrawal(account);
            const balance = await instance.getBalance(account);
            let gas = new BigNumber(0);

            if (pending.eq(0)) {
                await instance.withdraw({from: account}).should.be.rejected;

            } else {
                const result = await instance.withdraw({from: account, gasPrice: GAS_PRICE.toNumber()});
                gas = GAS_PRICE.multipliedBy(result.receipt.gasUsed);

                const newPending = await instance.getPendingWithdrawal(account);
                const newBalance = await instance.getBalance(account);

                newPending.eq(0).should.be.true;
                balance.plus(pending).minus(gas).eq(newBalance).should.be.true;
            }
        }
    });

    it('should not allow to add pending withdrawal', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.addPendingWithdrawal(accounts[1], 100).should.be.rejected;
    });

});