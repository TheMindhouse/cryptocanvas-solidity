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

    getBitmap = async (canvasId) => {
        const bitmap = await this.instance.getBitmap(canvasId);
        return bitmap.map(it => parseInt(it));
    };

    countPaintedPixelsByAddress = async (address, canvasId) => parseInt(await this.instance.countPaintedPixelsByAddress(address, canvasId));

    getCanvasPaintedPixels = async (canvasId) => parseInt(await this.instance.getCanvasPaintedPixels(canvasId));

    getPixelAuthor = async (canvasId, pixelIndex) => (await this.instance.getPixelAuthor(canvasId, pixelIndex)).toString();

    getCanvasState = async (canvasId) => parseInt(await this.instance.getCanvasState(canvasId));

    getLastBidForCanvas = async (canvasId) => {
        const bid = await this.instance.getLastBidForCanvas(canvasId);
        return {address: bid[0], amount: parseInt(bid[1]), finishTime: parseInt(bid[2])}
    };

    getTime = async () => parseInt(await this.instance.getTime());

    mockTime = async (time) => await this.instance.mockTime(time);

    //UTILITY

    /**
     * Calling this function for huge set of pixels causes test failure! Don't call it with default
     * values [0 - 4096>, this set is too large!
     */
    fillCanvas = (canvasId, firstIndex = 0, lastIndex = 4096, color = 10) => {
        const promises = [];
        for (let i = firstIndex; i < lastIndex; i++) {
            promises.push(this.setPixel(canvasId, i, color));
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
        const toForward = hours * 3600; //to seconds
        const currentTime = this.getTime();

        await this.mockTime(currentTime + toForward);
    }

}