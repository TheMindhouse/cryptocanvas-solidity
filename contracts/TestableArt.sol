pragma solidity 0.4.21;

import "./CryptoArt.sol";

/**
 * @dev Contract with utility methods for testing.
 *
 * **NEVER DEPLOY THIS CONTRACT!!!**
 */
contract TestableArt is CryptoArt {

    uint public mockTime;

    function getTime() public view returns (uint) {
        return mockTime;
    }

    function mockTime(uint _time) external {
        mockTime = _time;
    }

}
