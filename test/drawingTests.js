const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const CryptoArt = artifacts.require("CryptoArt");

contract('Drawing on canvas suite', async (accounts) => {

    it("shouldn't allow to draw on non existing canvas", async () => {
        const instance = await CryptoArt.deployed();
        return instance.setPixel(0, 1, 10).should.be.rejected;
    });

    it('should disallow to set pixel with color 0', async function () {
        const instance = await CryptoArt.deployed();
        await instance.createCanvas();

        return instance.setPixel(0, 0, 0).should.be.rejected;
    });

    it('should disallow to set pixel with color bigger that 255', async function () {
        const instance = await CryptoArt.deployed();
        return instance.setPixel(0, 0, 256).should.be.rejected;
    });

    it('should disallow to set pixel with invalid index', async function () {
        const instance = await CryptoArt.deployed();
        return instance.setPixel(0, 5000, 10).should.be.rejected;
    });

    it('should disallow to set pixel on invalid canvas', async function () {
        const instance = await CryptoArt.deployed();
        return instance.setPixel(10, 10, 10).should.be.rejected;
    });

    it('should fail if asked about bitmap of invalid canvas', async function () {
        const instance = await CryptoArt.deployed();
        return instance.getBitmap(2).should.be.rejected;
    });

    it('should set pixels', async function () {
        const instance = await CryptoArt.deployed();
        const toBeDrawn = [10, 250, 230, 110];

        await toBeDrawn.forEach(async (value, index) => {
            await instance.setPixel(0, index, value);
        });

        let bitmap = await instance.getBitmap(0);
        bitmap = bitmap.map(it => parseInt(it.toString()));
        const drawn = bitmap.slice(0, toBeDrawn.length);

        drawn.should.be.equalTo(toBeDrawn);

        for (let i = toBeDrawn.length; i < bitmap.length; i++) {
            bitmap[i].should.be.eq(0);
        }

    });

    it('should remember pixel\'s author', async function () {
        const instance = await CryptoArt.deployed();
        instance.setPixel(0, 0, 10, {from: accounts[1]});

        const author = (await instance.getPixelAuthor(0, 0)).toString();
        author.should.be.eq(accounts[1]);
    });

    it('should count address\' pixels', async function () {
        const instance = await CryptoArt.deployed();
        const pixelsToSet = 5;
        for (let i = 0; i < pixelsToSet; i++) {
            await instance.setPixel(0, i * 3, 10, {from: accounts[2]});
        }

        const count = parseInt((await instance.countPaintedPixelsByAddress(accounts[2], 0)).toString());
        count.should.be.eq(pixelsToSet)
    });

    it('should count canvas painted pixels', async function () {
        const instance = await CryptoArt.deployed();
        await instance.createCanvas();

        const pixelsToSet = 6;
        for (let i = 0; i < pixelsToSet; i++) {
            await instance.setPixel(1, i * 3, 10, {from: accounts[2]});
        }

        const paintedPixels = parseInt((await instance.getCanvasPaintedPixels(1)).toString());
        paintedPixels.should.be.eq(pixelsToSet);
    });

    //todo shouldn't allow to paint of finished canvas! - maybe in initial bidding - tests'll be faster

});