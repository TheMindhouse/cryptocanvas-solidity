pragma solidity ^0.4.21;

import "./Ownable.sol";

/**
 * @dev Contract that is aware of time.
 */
contract TimeAware is Ownable {

    function getTime() public view returns (uint) {
        return now;
    }

}
