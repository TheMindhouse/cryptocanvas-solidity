pragma solidity 0.4.21;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/CryptoArt.sol";

/**
* Tests functionality of CanvasFactory.
*/
contract TestCanvasFactory {

    CryptoArt tested;

    function beforeEach() public {
        tested = CryptoArt(DeployedAddresses.CryptoArt());
    }

    function afterEach() public {
        uint artworkCount = tested.getArtworksCount();
        uint active = tested.activeCanvasCount();

        Assert.isAtMost(active, artworkCount, "Active canvas count cannot be greater than canvas count!");
    }

    function testNoCanvasesAtStart() {
        uint expected = 0;

        Assert.equal(uint(tested.getArtworksCount()), expected, "Artwork count has to be 0!");
        Assert.equal(uint(tested.activeCanvasCount()), expected, "Active canvases has to be 0!");
    }

}

