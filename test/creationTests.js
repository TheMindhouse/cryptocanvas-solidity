import {fillWholeCanvas} from "./utils";

const CryptoArt = artifacts.require("CryptoArt");

contract('Canvas creation suite', async (accounts) => {

    it("should be empty when deployed", async () => {
        const instance = await CryptoArt.deployed();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getArtworksCount();

        assert.equal(activeCount.valueOf(), 0);
        assert.equal(count.valueOf(), 0);
    });

    it("should create contracts", async () => {
        let instance = await CryptoArt.deployed();
        await instance.createCanvas();
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getArtworksCount();

        assert.equal(activeCount.valueOf(), 2);
        assert.equal(count.valueOf(), 2);
    });

    it('should decrement activeCount after filling canvas', async () => {
        let instance = await CryptoArt.deployed();

        await fillWholeCanvas(instance, 1);

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getArtworksCount();

        assert.equal(activeCount.valueOf(), 1);
        assert.equal(count.valueOf(), 2);
    });

    afterEach(async () => {
        const instance = await CryptoArt.deployed();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getArtworksCount();

        assert.isAtMost(activeCount, count);
    });

});