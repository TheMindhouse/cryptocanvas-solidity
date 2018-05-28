const BigNumber = require('bignumber.js');

export class TestableArtWrapper {

    /**
     *
     * @param {TestableArt} testableArt
     */
    constructor(testableArt) {
        this.instance = testableArt;
    }

    //Mapping for contract's methods

    MAX_ACTIVE_CANVAS = async () => parseInt(await this.instance.MAX_ACTIVE_CANVAS());

    PIXEL_COUNT = async () => parseInt(await this.instance.PIXEL_COUNT());

    minimumBidAmount = async () => parseInt(await this.instance.minimumBidAmount());

    createCanvas = async () => await this.instance.createCanvas();

    activeCanvasCount = async () => {
        const activeCount = await this.instance.activeCanvasCount();
        return parseInt(activeCount);
    };

    canvasCount = async () => {
        const count = await this.instance.getCanvasCount();
        return parseInt(count);
    };

    isCanvasFinished = async (canvasId) => {
        return await this.instance.isCanvasFinished(canvasId);
    };

    getCanvasByState = async (state) => {
        const result = await this.instance.getCanvasByState(state);
        return result.map(it => parseInt(it));
    };

    setPixel = async (canvasId, pixelId, color, options = {}) => await this.instance.setPixel(canvasId, pixelId, color, options);

    /**
     * @param {Number} canvasId
     * @param {Array<Number>} indexes
     * @param {Array<Number>} colors
     * @param options
     * @returns {Promise<*>}
     */
    setPixels = async (canvasId, indexes, colors, options = {}) => await this.instance.setPixels(canvasId, indexes, colors, options);

    getCanvasBitmap = async (canvasId) => {
        const bitmap = await this.instance.getCanvasBitmap(canvasId);
        return bitmap.map(it => parseInt(it));
    };

    getPaintedPixelsCountByAddress = async (address, canvasId) => parseInt(await this.instance.getPaintedPixelsCountByAddress(address, canvasId));

    getCanvasPaintedPixelsCount = async (canvasId) => parseInt(await this.instance.getCanvasPaintedPixelsCount(canvasId));

    getPixelAuthor = async (canvasId, pixelIndex) => (await this.instance.getPixelAuthor(canvasId, pixelIndex)).toString();

    getCanvasState = async (canvasId) => parseInt(await this.instance.getCanvasState(canvasId));

    getLastBidForCanvas = async (canvasId) => {
        const bid = await this.instance.getLastBidForCanvas(canvasId);
        return {address: bid[1], amount: parseInt(bid[2]), finishTime: parseInt(bid[3])}
    };

    makeBid = async (canvasId, options) => await this.instance.makeBid(canvasId, options);

    getTime = async () => parseInt(await this.instance.getTime());

    mockTime = async (time) => await this.instance.mockTime(time);

    balanceOf = async (address) => parseInt(await this.instance.balanceOf(address));

    calculateCommission = async (canvasId) => {
        const result = await this.instance.calculateCommission(canvasId);
        return {
            commission: result[0],
            isPaid: result[1]
        }
    };

    calculateReward = async (canvasId, address) => {
        const result = await this.instance.calculateReward(canvasId, address);
        return {
            pixelCount: parseInt(result[0]),
            reward: parseInt(result[1]),
            isPaid: result[2]
        }
    };

    addRewardToPendingWithdrawals = async (canvasId, options = {}) => await this.instance.addRewardToPendingWithdrawals(canvasId, options);

    addCommissionToPendingWithdrawals = async (canvasId, options = {}) => await this.instance.addCommissionToPendingWithdrawals(canvasId, options);

    getCanvasInfo = async (canvasId) => {
        const result = await this.instance.getCanvasInfo(canvasId);
        return {
            id: parseInt(result[0]),
            paintedPixels: parseInt(result[1]),
            canvasState: parseInt(result[2]),
            initialBiddingFinishTime: parseInt(result[3]),
            owner: result[4]
        };
    };

    getCanvasByOwner = async (owner) => await this.instance.getCanvasByOwner(owner);

    setMinimumBidAmount = async (amount, options = {}) => await this.instance.setMinimumBidAmount(amount, options);

    /**
     * @returns {Promise<Array<String>>}
     */
    getCanvasPainters = async (canvasId) => await this.instance.getCanvasPainters(canvasId);

    //TRADING

    acceptSellOffer = async (canvasId, options = {}) => await this.instance.acceptSellOffer(canvasId, options);

    offerCanvasForSale = async (canvasId, minPrice, options = {}) => await this.instance.offerCanvasForSale(canvasId, minPrice, options);

    offerCanvasForSaleToAddress = async (canvasId, minPrice, address, options = {}) => await this.instance.offerCanvasForSaleToAddress(canvasId, minPrice, address, options);

    cancelSellOffer = async (canvasId, options = {}) => await this.instance.cancelSellOffer(canvasId, options);

    makeBuyOffer = async (canvasId, options = {}) => await this.instance.makeBuyOffer(canvasId, options);

    cancelBuyOffer = async (canvasId, options = {}) => await this.instance.cancelBuyOffer(canvasId, options);

    acceptBuyOffer = async (canvasId, minPrice, options = {}) => await this.instance.acceptBuyOffer(canvasId, minPrice, options);

    getCurrentBuyOffer = async (canvasId) => {
        const result = await this.instance.getCurrentBuyOffer(canvasId);
        return {
            hasOffer: result[0],
            buyer: result[1],
            amount: parseInt(result[2])
        }
    };

    getCurrentSellOffer = async (canvasId) => {
        const result = await this.instance.getCurrentSellOffer(canvasId);
        return {
            isForSale: result[0],
            seller: result[1],
            minPrice: parseInt(result[2]),
            onlySellTo: result[3]
        }
    };

    getPendingWithdrawal = async (address) => await this.instance.getPendingWithdrawal(address);

    withdraw = async (options = {}) => await this.instance.withdraw(options);

    /**
     * This has to fail! Critical.
     */
    addPendingWithdrawal = async (address, amount) => await this.instance.addPendingWithdrawal(address, amount);

    //UTILITY

    getCanvasesWithSellOffer = async (includePrivateOffers) => {
        return (await this.instance.getCanvasesWithSellOffer(includePrivateOffers))
            .map(value => value.toNumber());
    };

    /**
     * Calling this function for huge set of pixels causes test failure! Don't call it with default
     * values [0 - 4096>, this set is too large!
     */
    fillCanvas = (canvasId, firstIndex = 0, lastIndex = 4096, color = 10, options = {}) => {
        const promises = [];
        for (let i = firstIndex; i < lastIndex; i++) {
            promises.push(this.setPixel(canvasId, i, color, options));
        }

        return Promise.all(promises);
    };

    /**
     * Fills all canvas with 10 color.
     */
    fillWholeCanvas = async (canvasId) => {
        for (let i = 0; i < 8; i++) {
            await this.fillCanvas(canvasId, i * 512, (i + 1) * 512);
        }
    };

    /**
     * Pushes time forward.
     * @param hours     hours to be pushed forward
     * @param minutes   minutes, default 0
     * @param seconds   seconds, default 0
     * @returns {Promise<void>}
     */
    pushTimeForward = async (hours, minutes = 0, seconds = 0) => {
        const toForward = hours * 3600 + minutes * 60 + seconds;
        const currentTime = await this.getTime();

        await this.mockTime(currentTime + toForward);
    };

    getBalance = (address) => new BigNumber(this.instance.contract._eth.getBalance(address));

    getBalanceOfContract = () => this.getBalance(this.instance.contract.address);

}