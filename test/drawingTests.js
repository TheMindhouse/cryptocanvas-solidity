import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");

contract('Drawing on canvas suite', async (accounts) => {

    it("shouldn't allow to draw on non existing canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 1, 10).should.be.rejected;
    });

    it('should disallow to set pixel with color 0', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        return instance.setPixel(0, 0, 0).should.be.rejected;
    });

    it('should disallow to set pixel with color bigger that 255', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 0, 256).should.be.rejected;
    });

    it('should disallow to set pixel with invalid index', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 5000, 10).should.be.rejected;
    });

    it('should disallow to set pixel on invalid canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(10, 10, 10).should.be.rejected;
    });

    it('should fail if asked about bitmap of invalid canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.getCanvasBitmap(2).should.be.rejected;
    });

    it('should set pixels', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const toBeDrawn = [10, 250, 230, 110];

        await toBeDrawn.forEach(async (value, index) => {
            await instance.setPixel(0, index, value);
        });

        const bitmap = await instance.getCanvasBitmap(0);
        const drawn = bitmap.slice(0, toBeDrawn.length);

        drawn.should.be.equalTo(toBeDrawn);

        for (let i = toBeDrawn.length; i < bitmap.length; i++) {
            bitmap[i].should.be.eq(0);
        }

    });

    it('should disallow to paint over already set pixels', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 0, 10).should.be.rejected;
    });

    it('should set many pixels at once', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const pixels = [4, 5, 6, 7];
        const colors = [33, 54, 11, 99];

        await instance.setPixels(0, pixels, colors, {from: accounts[1]});

        const bitmap = await instance.getCanvasBitmap(0);
        const drawn = bitmap.slice(4, 4 + colors.length);

        drawn.should.be.equalTo(colors);

        await pixels.forEach(async (value) => {
            const author = await instance.getPixelAuthor(0, value);
            author.should.be.eq(accounts[1]);
        });
    });

    it('should fail when batch painting didn\'t paint any pixels', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const pixels = [4, 5, 6, 7];
        const colors = [33, 54, 11, 99];

        return instance.setPixels(0, pixels, colors).should.be.rejected;
    });

    it('should batch paint pixels if at least one pixel is to be set', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const pixels = [4, 5, 6, 7, 8];
        const colors = [33, 54, 11, 99, 99];

        const pixelCountBefore = await instance.getCanvasPaintedPixelsCount(0);
        await instance.setPixels(0, pixels, colors);
        const pixelCountAfter = await instance.getCanvasPaintedPixelsCount(0);

        pixelCountBefore.should.be.eq(pixelCountAfter - 1);
    });

    it('should remember pixel\'s author', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.setPixel(0, 9, 10, {from: accounts[1]});

        const author = await instance.getPixelAuthor(0, 9);
        author.should.be.eq(accounts[1]);
    });

    it('should count address\' pixels', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const pixelsToSet = 5;
        for (let i = 0; i < pixelsToSet; i++) {
            await instance.setPixel(0, 10 + i * 3, 10, {from: accounts[2]});
        }

        const count = await instance.getPaintedPixelsCountByAddress(accounts[2], 0);
        count.should.be.eq(pixelsToSet)
    });

    it('should count canvas painted pixels', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        const pixelsToSet = 6;
        for (let i = 0; i < pixelsToSet; i++) {
            await instance.setPixel(1, i * 3, 10, {from: accounts[2]});
        }

        const paintedPixels = await instance.getCanvasPaintedPixelsCount(1);
        paintedPixels.should.be.eq(pixelsToSet);
    });

});